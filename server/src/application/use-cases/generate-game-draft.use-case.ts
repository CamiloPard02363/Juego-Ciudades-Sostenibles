import { Inject, Injectable } from '@nestjs/common';
import {
  AI_CONTENT_ASSISTANT,
  type AiContentAssistant,
} from '../../domain/ports/ai-content-assistant.port.js';
import { IMAGE_STORAGE, type ImageStorage } from '../../domain/ports/image-storage.port.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { GameType, type GameTypeName } from '../../domain/value-objects/game-type.vo.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { resolveGamePromptSpec, type GamePromptSpec } from '../ai/game-prompt-catalog.js';
import { FileTextExtractor, type SourceFile } from '../../infrastructure/ai/file-text-extractor.js';
import { extractEmbeddedImages } from '../../infrastructure/ai/content-image-extractor.js';

export interface GenerateGameDraftInput {
  gameType: string;
  /** Solo relevante para MEMORY_MATCH — distingue PAIRS de OPPOSITES. */
  mode?: string;
  /** Instrucción libre del usuario para guiar a la IA (p. ej. "enfócate en el capítulo 3") — nunca reemplaza a `files`. */
  message?: string;
  files: SourceFile[];
}

export interface GenerateGameDraftOutput {
  config: Record<string, unknown>;
  content: unknown[];
  /** Ver `AiContentAssistant.GenerateGameDraftOutput` — mismo criterio de saneo (issue #210). */
  suggestedTitle?: string;
  suggestedDescription?: string;
}

const MAX_SUGGESTED_TITLE_LENGTH = 120;
const MAX_SUGGESTED_DESCRIPTION_LENGTH = 500;

/**
 * Nunca deja pasar un `suggestedTitle`/`suggestedDescription` vacío o
 * absurdamente largo hacia el formulario — si no pasa este saneo simple, se
 * trata como si la IA no lo hubiera mandado (`undefined`), nunca como un
 * error que tumbe la generación completa (issue #210: esto es un extra, no
 * el propósito principal del borrador).
 */
function sanitizeSuggestedText(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

const MAX_FILES = 65;

/**
 * Arma un borrador de `config`/`content` para un juego a partir de archivos
 * que sube el usuario — nunca guarda nada: el profesor revisa/edita el
 * borrador en el formulario de siempre y lo crea con el flujo normal
 * (`POST /games`). Por eso NO depende de `GameRepository` ni de
 * `GameFactoryService`: solo genera datos, no persiste.
 *
 * La validación es la MISMA que corre al crear un juego a mano
 * (`ContentValidatorRegistry`) — si el modelo de IA devuelve algo que no
 * cumple las reglas de ese `gameType`, se rechaza igual que si un humano
 * hubiera mandado datos inválidos. No existe un camino de validación
 * paralelo "más permisivo" para contenido generado por IA.
 *
 * Tipos de juego con imagen obligatoria por elemento (Quién Es, Parejas): la
 * IA nunca inventa esas imágenes. El profesor sube sus propias imágenes junto
 * con los demás archivos — sueltas, o dentro de un PDF/Word con varias fotos
 * adentro (se extraen automáticamente, ver `content-image-extractor.ts`,
 * issue #208) — y este caso de uso las sube a Cloudinary (mismo
 * `ImageStorage` que usa la subida manual) y le pide al modelo que las
 * "organice" — que les asigne un concepto — referenciándolas por posición
 * ("imageIndex") en vez de por URL, y luego reemplaza cada índice por la URL
 * real ya subida antes de validar.
 *
 * Algunos `gameType` (hoy, "Pares"/MEMORY_MATCH-PAIRS, issue #210) piden en
 * sus `instructions` que el modelo también proponga `suggestedTitle`/
 * `suggestedDescription` para el formulario completo, no solo el contenido
 * — se sanean y se devuelven aparte de `config`/`content` (nunca dentro de
 * `config`, que es lo único que persiste el juego).
 */
@Injectable()
export class GenerateGameDraftUseCase
  implements UseCase<GenerateGameDraftInput, GenerateGameDraftOutput>
{
  constructor(
    @Inject(AI_CONTENT_ASSISTANT) private readonly aiContentAssistant: AiContentAssistant,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
    private readonly fileTextExtractor: FileTextExtractor,
    private readonly contentValidators: ContentValidatorRegistry,
  ) {}

  async execute(input: GenerateGameDraftInput): Promise<GenerateGameDraftOutput> {
    if (input.files.length === 0) {
      throw new InvalidGameContentError('sube al menos un archivo para generar el juego.');
    }
    if (input.files.length > MAX_FILES) {
      throw new InvalidGameContentError(`sube como máximo ${MAX_FILES} archivos.`);
    }

    const gameType = GameType.create(input.gameType);
    const spec = resolveGamePromptSpec(gameType.getName(), input.mode);
    if (!spec) {
      throw new InvalidGameContentError(
        `el asistente de IA todavía no está disponible para "${input.gameType}".`,
      );
    }

    return spec.imageRequirement
      ? this.executeWithContentImages(gameType.getName(), spec, input.files, input.message)
      : this.executeTextOnly(gameType.getName(), spec, input.files, input.message);
  }

  /** Tipos de juego sin imagen obligatoria (Dominó, Laberinto, Escaleras, Opuestos, Dual Quest…). */
  private async executeTextOnly(
    gameTypeName: GameTypeName,
    spec: GamePromptSpec,
    files: SourceFile[],
    message: string | undefined,
  ): Promise<GenerateGameDraftOutput> {
    const sourceText = await this.fileTextExtractor.extractAll(files);
    if (!sourceText.trim()) {
      throw new InvalidGameContentError('no se pudo extraer texto de los archivos subidos.');
    }

    const draft = await this.aiContentAssistant.generateGameDraft({
      gameType: gameTypeName,
      sourceText,
      instructions: buildInstructions(spec, message),
    });

    const content =
      gameTypeName === 'MEMORY_MATCH' ? normalizeOppositesImageFields(draft.content) : draft.content;
    return this.validate(gameTypeName, draft.config, content, draft);
  }

  /** Tipos de juego con imagen obligatoria por elemento (Quién Es, Parejas). */
  private async executeWithContentImages(
    gameTypeName: GameTypeName,
    spec: GamePromptSpec,
    files: SourceFile[],
    message: string | undefined,
  ): Promise<GenerateGameDraftOutput> {
    const { min, max, enforceMinimum } = spec.imageRequirement!;
    const directImageFiles = files.filter((file) => file.mimeType.startsWith('image/'));
    const documentFiles = files.filter((file) => !file.mimeType.startsWith('image/'));

    // PDF/Word con fotos incrustadas (en vez de un archivo de imagen suelto
    // por tarjeta) cuentan igual — issue #208: se extraen y se tratan como
    // si el usuario hubiera subido cada una por separado. `documentFiles`
    // sigue pasando completo (sin filtrar) a la extracción de texto de más
    // abajo: un PDF de fotos con pie de foto aporta AMBAS cosas (imágenes Y
    // texto de contexto), no una sola.
    const embeddedImages = (
      await Promise.all(documentFiles.map((file) => extractEmbeddedImages(file)))
    ).flat();
    const embeddedImageFiles: SourceFile[] = embeddedImages.map((image) => ({
      buffer: image.buffer,
      mimeType: image.mimeType,
      filename: image.filename,
    }));

    const imageFiles = [...directImageFiles, ...embeddedImageFiles];

    if (imageFiles.length === 0) {
      throw new InvalidGameContentError(
        'sube al menos una imagen — suelta, o dentro de un PDF/Word (la IA las extrae automáticamente); tú las subes, la IA solo las organiza.',
      );
    }
    if (enforceMinimum !== false && imageFiles.length < min) {
      throw new InvalidGameContentError(
        `sube al menos ${min} imágenes — tú las subes (sueltas o dentro de un PDF/Word), la IA solo las organiza con el concepto que le corresponde a cada una.`,
      );
    }
    if (imageFiles.length > max) {
      throw new InvalidGameContentError(`sube como máximo ${max} imágenes.`);
    }

    const folder = spec.contentImageFolder ?? 'ai-game-content';
    const [uploadedImages, imageDescriptions, sourceText] = await Promise.all([
      Promise.all(imageFiles.map((file) => this.imageStorage.upload(file.buffer, folder))),
      Promise.all(
        imageFiles.map((file) =>
          this.aiContentAssistant.describeImage({ buffer: file.buffer, mimeType: file.mimeType }),
        ),
      ),
      documentFiles.length > 0 ? this.fileTextExtractor.extractAll(documentFiles) : Promise.resolve(''),
    ]);

    const draft = await this.aiContentAssistant.generateGameDraft({
      gameType: gameTypeName,
      sourceText: sourceText.trim() || '(el usuario no adjuntó texto de referencia — usa solo las imágenes.)',
      instructions: buildInstructions(spec, message),
      imageDescriptions,
    });

    const content = resolveImageIndexes(draft.content, uploadedImages.map((image) => image.url));
    return this.validate(gameTypeName, draft.config, content, draft);
  }

  private validate(
    gameTypeName: GameTypeName,
    config: unknown,
    content: unknown,
    draft: { suggestedTitle?: string; suggestedDescription?: string },
  ): GenerateGameDraftOutput {
    const validator = this.contentValidators.resolve(gameTypeName);
    const validatedConfig = validator.validateConfig(config);
    // isDraft: true porque esto SIEMPRE es un borrador (nunca el juego
    // final) — el validador de cada gameType decide si eso le cambia algo;
    // la mayoría lo ignora (ver ContentValidationOptions).
    const validatedContent = validator.validateContent(content, validatedConfig, { isDraft: true });
    return {
      config: validatedConfig,
      content: validatedContent,
      suggestedTitle: sanitizeSuggestedText(draft.suggestedTitle, MAX_SUGGESTED_TITLE_LENGTH),
      suggestedDescription: sanitizeSuggestedText(draft.suggestedDescription, MAX_SUGGESTED_DESCRIPTION_LENGTH),
    };
  }
}

/**
 * Arma el bloque de instrucciones que recibe el modelo: la instrucción fija
 * de este tipo de juego (`spec.instructions`) primero, la del usuario
 * (opcional, texto libre desde el chat del asistente) después — así una
 * instrucción del usuario puede afinar el resultado pero nunca reemplaza las
 * reglas del tipo de juego, que siempre van primero.
 */
function buildInstructions(spec: GamePromptSpec, message: string | undefined): string {
  const userInstructions = message?.trim()
    ? `\n\nInstrucciones del usuario (aplícalas dentro de las reglas de arriba):\n${message.trim()}`
    : '';
  return `${spec.instructions}${userInstructions}\n\nForma de JSON esperada:\n${spec.jsonShapeExample}`;
}

/**
 * Reemplaza cada "imageIndex" que devolvió la IA por la URL real ya subida a
 * Cloudinary en esa posición — la IA nunca ve ni inventa URLs, solo elige
 * "cuál imagen (por número) le corresponde a cuál concepto".
 */
function resolveImageIndexes(content: unknown, imageUrls: string[]): unknown {
  if (!Array.isArray(content)) return content;

  return content.map((item, position) => {
    if (typeof item !== 'object' || item === null) return item;
    const raw = item as Record<string, unknown>;
    const index = raw.imageIndex;

    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= imageUrls.length) {
      throw new InvalidGameContentError(
        `la IA referenció una imagen inválida en el elemento ${position} — vuelve a intentarlo.`,
      );
    }

    const { imageIndex: _imageIndex, ...rest } = raw;
    return { ...rest, imageUrl: imageUrls[index as number] };
  });
}

/**
 * MEMORY_MATCH en modo OPPOSITES exige que posImageUrl/negImageUrl sean
 * `null` explícito (no `undefined`/ausente) cuando no hay imagen — se
 * normaliza acá en vez de confiar en que el modelo siempre lo escriba así.
 * Solo se llama para OPPOSITES (ver `executeTextOnly`), nunca para otros
 * tipos de juego que no tienen estos campos.
 */
function normalizeOppositesImageFields(content: unknown): unknown {
  if (!Array.isArray(content)) return content;

  return content.map((item) => {
    if (typeof item !== 'object' || item === null) return item;
    const raw = item as Record<string, unknown>;
    return {
      ...raw,
      posImageUrl: raw.posImageUrl ?? null,
      negImageUrl: raw.negImageUrl ?? null,
    };
  });
}
