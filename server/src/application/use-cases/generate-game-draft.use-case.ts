import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { normalizeDraft } from '../ai/draft-normalizers.js';
import { sanitizeEmoji } from '../ai/element-illustration.js';
import {
  ContentImageResolver,
  describeImageResolution,
  type ImageNeed,
} from '../services/content-image-resolver.service.js';
import {
  FileTextExtractor,
  type ImageDescription,
  type SourceFile,
  type TextExtraction,
} from '../../infrastructure/ai/file-text-extractor.js';
import { extractEmbeddedImages } from '../../infrastructure/ai/content-image-extractor.js';

export interface GenerateGameDraftInput {
  gameType: string;
  /** Solo relevante para MEMORY_MATCH — distingue PAIRS de OPPOSITES. */
  mode?: string;
  /**
   * Instrucción libre del usuario para guiar a la IA (p. ej. "enfócate en el
   * capítulo 3", "nivel fácil para primaria", o directamente el tema completo
   * del juego) — puede ser la ÚNICA fuente de contenido si `files` viene
   * vacío, en CUALQUIER tipo de juego (issues #234/#238).
   */
  message?: string;
  /**
   * Puede venir vacío siempre que `message` traiga texto (issues #234/#238)
   * — `execute()` es quien decide, según el `GamePromptSpec`, cómo armar el
   * borrador con lo que haya.
   */
  files: SourceFile[];
}

export interface GenerateGameDraftOutput {
  config: Record<string, unknown>;
  content: unknown[];
  /**
   * Aviso opcional para mostrarle al usuario junto con el borrador (p. ej. de
   * dónde salió cada imagen, o qué archivos la IA no pudo leer).
   */
  notice?: string;
}

const MAX_FILES = 65;
/**
 * Veces que se le devuelve a la IA un borrador rechazado (con el motivo del
 * rechazo) para que lo corrija, antes de rendirse y mostrarle el error al
 * usuario. Total de llamadas por generación: 1 + este número.
 */
const MAX_REPAIR_ATTEMPTS = 2;

const NO_FILES_TEXT =
  '(el usuario no adjuntó archivos — genera el juego únicamente a partir de las instrucciones de abajo.)';
const UNREADABLE_FILES_TEXT =
  '(no se pudo leer ningún archivo adjunto — genera el juego únicamente a partir de las instrucciones de abajo.)';

/** Nombres de archivo que no dicen qué hay adentro (cámara, capturas, descargas…). */
const GENERIC_FILE_NAME = /^(img|image|imagen|foto|photo|picture|pic|dsc|dscn|pxl|screenshot|captura|capture|whatsapp|scan|download|untitled|sin ?titulo)/i;

interface GenerationRequest {
  gameTypeName: GameTypeName;
  mode?: string;
  instructions: string;
  sourceText: string;
  imageDescriptions?: string[];
  /** Arregla la forma/tamaño de lo que devolvió la IA y lo deja listo para validar (puede lanzar `InvalidGameContentError`). */
  prepare: (raw: { config: unknown; content: unknown }) => { config: unknown; content: unknown };
}

interface ValidatedGeneration {
  /** Ya validado con las reglas del tipo de juego. */
  draft: { config: Record<string, unknown>; content: unknown[] };
  /** Lo mismo ANTES de validar: conserva campos extra (imageQuery, emoji…) que el validador descarta. */
  prepared: { config: unknown; content: unknown };
  sourceTruncated: boolean;
}

/**
 * Arma un borrador de `config`/`content` para un juego a partir de archivos
 * que sube el usuario y/o un texto que escribe — nunca guarda nada: el
 * profesor revisa/edita el borrador en el formulario de siempre y lo crea con
 * el flujo normal (`POST /games`). Por eso NO depende de `GameRepository` ni
 * de `GameFactoryService`: solo genera datos, no persiste.
 *
 * La validación es la MISMA que corre al crear un juego a mano
 * (`ContentValidatorRegistry`) — si el modelo de IA devuelve algo que no
 * cumple las reglas de ese `gameType`, se rechaza igual que si un humano
 * hubiera mandado datos inválidos. No existe un camino de validación
 * paralelo "más permisivo" para contenido generado por IA.
 *
 * A prueba de errores (issue #21): antes de rechazar, (1) se normalizan los
 * descuidos de forma/tamaño que un modelo comete seguido (ver
 * `draft-normalizers.ts`) y (2) si el validador igual lo rechaza, se le
 * devuelve a la IA el motivo exacto para que lo corrija — hasta
 * `MAX_REPAIR_ATTEMPTS` veces. Solo si sigue fallando el usuario ve el error.
 *
 * Fuentes de contenido: siempre alcanza con UNA — un texto (`message`), un
 * documento (PDF/Word/Excel/CSV) o imágenes (la IA las lee con visión). Si la
 * lectura de imágenes no está disponible, la generación sigue con lo que haya
 * (texto, nombre de los archivos) y se le avisa al usuario.
 *
 * Tipos con imagen por elemento (Quién Es, Parejas):
 * - Si el usuario sube sus imágenes (sueltas, o dentro de un PDF/Word —
 *   issue #208), SON ESAS las que se usan: se suben al almacenamiento y la IA
 *   solo las "organiza" (les asigna un concepto), referenciándolas por
 *   posición ("imageIndex") en vez de por URL.
 * - Si NO sube ninguna, la IA arma el contenido con el tema y consigue una
 *   imagen por elemento (ver `ContentImageResolver`): una foto libre de
 *   Wikimedia Commons o, si no hay, una ilustración básica que crea ella.
 */
@Injectable()
export class GenerateGameDraftUseCase
  implements UseCase<GenerateGameDraftInput, GenerateGameDraftOutput>
{
  private readonly logger = new Logger(GenerateGameDraftUseCase.name);

  constructor(
    @Inject(AI_CONTENT_ASSISTANT) private readonly aiContentAssistant: AiContentAssistant,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
    private readonly fileTextExtractor: FileTextExtractor,
    private readonly contentValidators: ContentValidatorRegistry,
    private readonly contentImageResolver: ContentImageResolver,
  ) {}

  async execute(input: GenerateGameDraftInput): Promise<GenerateGameDraftOutput> {
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

    // Nunca es obligatorio adjuntar un archivo (issues #234/#238), pero sí
    // hace falta UNA de las dos fuentes: archivos o mensaje.
    const message = input.message?.trim() || undefined;
    if (input.files.length === 0 && !message) {
      throw new InvalidGameContentError(
        spec.imageRequirement
          ? 'sube tus imágenes o escribe el tema para generar el juego.'
          : 'sube al menos un archivo o escribe el tema/instrucciones para generar el juego.',
      );
    }

    return spec.imageRequirement
      ? this.executeWithContentImages(gameType.getName(), input.mode, spec, input.files, message)
      : this.executeTextOnly(gameType.getName(), input.mode, spec, input.files, message);
  }

  /**
   * Tipos de juego sin imagen por elemento (Dominó, Laberintos, Escaleras,
   * Opuestos, Dúo Lógico…). `files` puede venir vacío (issue #234): sin
   * archivos, la IA genera el juego completo usando únicamente `message`.
   * Los archivos pueden ser documentos o imágenes (se leen con visión).
   */
  private async executeTextOnly(
    gameTypeName: GameTypeName,
    mode: string | undefined,
    spec: GamePromptSpec,
    files: SourceFile[],
    message: string | undefined,
  ): Promise<GenerateGameDraftOutput> {
    const extraction = await this.extractText(files);
    if (!extraction.text.trim() && !message) {
      throw new InvalidGameContentError(unreadableFilesReason(files));
    }

    const generation = await this.generateValidatedDraft({
      gameTypeName,
      mode,
      instructions: buildInstructions(spec, message),
      sourceText: extraction.text.trim() || (files.length > 0 ? UNREADABLE_FILES_TEXT : NO_FILES_TEXT),
      prepare: (raw) => normalizeDraft({ gameType: gameTypeName, mode, dedupe: true }, raw.config, raw.content),
    });

    return withNotice(generation.draft, [
      unreadableNotice(extraction.unreadable),
      truncatedNotice(generation.sourceTruncated),
    ]);
  }

  /** Tipos con imagen por elemento (Quién Es, Parejas). */
  private async executeWithContentImages(
    gameTypeName: GameTypeName,
    mode: string | undefined,
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
      // Sin ninguna imagen del usuario: la IA arma el contenido con el tema
      // (mensaje y/o documentos de texto) y consigue o crea las imágenes.
      return this.executeWithoutUserImages(gameTypeName, mode, spec, documentFiles, message);
    }
    if (enforceMinimum !== false && imageFiles.length < min) {
      throw new InvalidGameContentError(
        `sube al menos ${min} imágenes — tú las subes (sueltas o dentro de un PDF/Word), la IA solo las organiza con el concepto que le corresponde a cada una.`,
      );
    }
    if (imageFiles.length > max) {
      throw new InvalidGameContentError(`sube como máximo ${max} imágenes.`);
    }

    const [described, extraction] = await Promise.all([
      this.fileTextExtractor.describeImages(imageFiles),
      this.extractText(documentFiles),
    ]);

    const unreadableImages = described.filter((image) => !image.ok).length;
    const hasOtherContext = Boolean(message) || extraction.text.trim().length > 0;
    if (unreadableImages === imageFiles.length && !hasOtherContext && !imageFiles.some((file) => meaningfulFileLabel(file.filename))) {
      // Se corta ANTES de subir nada: no tiene sentido guardar imágenes de un borrador que no se va a generar.
      throw new InvalidGameContentError(
        'la IA no pudo leer tus imágenes en este momento y sus nombres de archivo no dicen qué contienen. Escribe el tema (o el nombre de cada imagen) y vuelve a intentarlo.',
      );
    }

    const folder = spec.contentImageFolder ?? 'ai-game-content';
    const uploadedImages = await Promise.all(imageFiles.map((file) => this.imageStorage.upload(file.buffer, folder)));
    const imageUrls = uploadedImages.map((image) => image.url);
    const generation = await this.generateValidatedDraft({
      gameTypeName,
      mode,
      instructions: buildInstructions(spec, message),
      sourceText: extraction.text.trim() || '(el usuario no adjuntó texto de referencia — usa solo las imágenes.)',
      imageDescriptions: described.map((image, index) => composeImageDescription(image, imageFiles[index].filename)),
      prepare: (raw) => {
        // Las tarjetas corresponden 1 a 1 con las imágenes del usuario: no se descarta ninguna.
        const normalized = normalizeDraft({ gameType: gameTypeName, mode, dedupe: false }, raw.config, raw.content);
        return { config: normalized.config, content: resolveImageIndexes(normalized.content, imageUrls) };
      },
    });

    return withNotice(generation.draft, [
      unreadableImages > 0
        ? `La IA no pudo leer el contenido de ${unreadableImages} de ${imageFiles.length} imágenes (límite de uso o archivo muy pesado): se guio por el nombre del archivo y tu texto — revisa los nombres de esas tarjetas.`
        : null,
      unreadableNotice(extraction.unreadable),
      truncatedNotice(generation.sourceTruncated),
    ]);
  }

  /**
   * Tipos con imagen por elemento (Quién Es, Parejas), pero SIN ninguna
   * imagen del usuario (issues #238/#240/#21): la IA genera el contenido
   * completo (labels/info/config) con el tema que escribió el usuario y/o el
   * texto de sus documentos, usando `spec.textOnlyInstructions`/
   * `textOnlyJsonShapeExample` en vez de las instrucciones normales (que
   * darían por hecho que hay imágenes que organizar).
   *
   * Cada elemento recibe su imagen de `ContentImageResolver`: primero una
   * foto libre de Wikimedia Commons (el modelo propone un `imageQuery`) y,
   * si no hay, una ilustración básica creada con el `emoji` y el `color` que
   * eligió el modelo. Si ni eso se pudo, queda `imageUrl: null` y el usuario
   * la agrega a mano (el mismo validador, en modo borrador, lo permite; al
   * crear el juego de verdad vuelve a exigirla).
   */
  private async executeWithoutUserImages(
    gameTypeName: GameTypeName,
    mode: string | undefined,
    spec: GamePromptSpec,
    documentFiles: SourceFile[],
    message: string | undefined,
  ): Promise<GenerateGameDraftOutput> {
    const extraction = await this.extractText(documentFiles);
    if (!extraction.text.trim() && !message) {
      throw new InvalidGameContentError(
        documentFiles.length > 0
          ? `${unreadableFilesReason(documentFiles)} También puedes subir tus imágenes.`
          : 'sube tus imágenes o escribe el tema para generar el juego.',
      );
    }

    const generation = await this.generateValidatedDraft({
      gameTypeName,
      mode,
      instructions: buildInstructions(
        {
          instructions: spec.textOnlyInstructions ?? spec.instructions,
          jsonShapeExample: spec.textOnlyJsonShapeExample ?? spec.jsonShapeExample,
        },
        message,
      ),
      sourceText: extraction.text.trim() || (documentFiles.length > 0 ? UNREADABLE_FILES_TEXT : NO_FILES_TEXT),
      prepare: (raw) => {
        const normalized = normalizeDraft({ gameType: gameTypeName, mode, dedupe: true }, raw.config, raw.content);
        return { config: normalized.config, content: withoutImageUrls(normalized.content) };
      },
    });

    const notices = [unreadableNotice(extraction.unreadable), truncatedNotice(generation.sourceTruncated)];
    // Validado ya sin imágenes: si el contenido del modelo no sirve se rechaza
    // antes de gastar búsquedas/descargas/subidas.
    const { draft, prepared } = generation;
    if (draft.content.length === 0) return withNotice(draft, notices);

    const needs = extractImageNeeds(prepared.content);
    const resolution = await this.contentImageResolver.resolve(needs, spec.contentImageFolder ?? 'ai-game-content');
    const imageNotice = describeImageResolution(resolution.counts, needs.length);

    const contentWithImages = draft.content.map((item, index) =>
      typeof item === 'object' && item !== null
        ? { ...item, imageUrl: resolution.images[index]?.url ?? null }
        : item,
    );

    try {
      const withImages = this.validate(gameTypeName, draft.config, contentWithImages);
      return withNotice(withImages, [...notices, imageNotice]);
    } catch (error) {
      // Las imágenes nunca deben tumbar un borrador ya válido.
      this.logger.warn(`El borrador con imágenes no pasó la validación; se entrega sin imágenes: ${errorText(error)}`);
      return withNotice(draft, [
        ...notices,
        'La IA armó el contenido, pero no pudo agregar las imágenes — agrega la imagen de cada elemento a mano.',
      ]);
    }
  }

  private async extractText(files: SourceFile[]): Promise<TextExtraction> {
    return files.length > 0 ? this.fileTextExtractor.extractAllDetailed(files) : { text: '', unreadable: [] };
  }

  /**
   * Pide el borrador a la IA, lo normaliza y lo valida. Si el contenido es
   * rechazado (`InvalidGameContentError`: JSON ilegible, valores fuera de
   * regla, un `imageIndex` inventado…), vuelve a pedirlo diciéndole a la IA
   * exactamente qué estuvo mal, hasta `MAX_REPAIR_ATTEMPTS` veces. Cualquier
   * otro error (proveedor caído, cuota agotada) se propaga tal cual: repetir
   * la llamada no lo arregla y ya lo manejó el adaptador.
   */
  private async generateValidatedDraft(request: GenerationRequest): Promise<ValidatedGeneration> {
    let lastReason = '';

    for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
      try {
        const raw = await this.aiContentAssistant.generateGameDraft({
          gameType: request.gameTypeName,
          sourceText: request.sourceText,
          instructions: attempt === 0 ? request.instructions : `${request.instructions}${repairSection(lastReason)}`,
          ...(request.imageDescriptions ? { imageDescriptions: request.imageDescriptions } : {}),
        });

        const prepared = request.prepare({ config: raw.config, content: raw.content });
        const draft = this.validate(request.gameTypeName, prepared.config, prepared.content);
        return { draft, prepared, sourceTruncated: raw.sourceTruncated === true };
      } catch (error) {
        if (!(error instanceof InvalidGameContentError)) throw error;
        lastReason = stripErrorPrefix(error.message);
        this.logger.warn(
          `La IA devolvió un borrador inválido para ${request.gameTypeName} (intento ${attempt + 1}/${MAX_REPAIR_ATTEMPTS + 1}): ${lastReason}`,
        );
      }
    }

    throw new InvalidGameContentError(
      `la IA no logró armar un borrador válido después de ${MAX_REPAIR_ATTEMPTS + 1} intentos (${lastReason}). Prueba con un tema más claro o con más detalle en las instrucciones.`,
    );
  }

  private validate(
    gameTypeName: GameTypeName,
    config: unknown,
    content: unknown,
  ): { config: Record<string, unknown>; content: unknown[] } {
    const validator = this.contentValidators.resolve(gameTypeName);
    const validatedConfig = validator.validateConfig(config);
    // isDraft: true porque esto SIEMPRE es un borrador (nunca el juego
    // final) — el validador de cada gameType decide si eso le cambia algo;
    // la mayoría lo ignora (ver ContentValidationOptions).
    const validatedContent = validator.validateContent(content, validatedConfig, { isDraft: true });
    return { config: validatedConfig, content: validatedContent };
  }
}

/**
 * Arma el bloque de instrucciones que recibe el modelo: la instrucción fija
 * de este tipo de juego (`spec.instructions`) primero, la del usuario
 * (opcional, texto libre desde el chat del asistente) después — así una
 * instrucción del usuario puede afinar el resultado pero nunca reemplaza las
 * reglas del tipo de juego, que siempre van primero.
 */
function buildInstructions(
  spec: Pick<GamePromptSpec, 'instructions' | 'jsonShapeExample'>,
  message: string | undefined,
): string {
  const userInstructions = message?.trim()
    ? `\n\nInstrucciones del usuario (aplícalas dentro de las reglas de arriba):\n${message.trim()}`
    : '';
  return `${spec.instructions}${userInstructions}\n\nForma de JSON esperada:\n${spec.jsonShapeExample}`;
}

/** Sección que se agrega a las instrucciones al reintentar: dice por qué se rechazó el borrador anterior. */
function repairSection(reason: string): string {
  return `\n\nIMPORTANTE: tu respuesta anterior fue RECHAZADA por esta razón: "${reason}"\nVuelve a responder el JSON COMPLETO corrigiendo exactamente ese problema y respetando todas las reglas de arriba. No expliques nada: solo el JSON.`;
}

/** Quita el prefijo "Contenido de juego inválido: " que agrega `InvalidGameContentError`. */
function stripErrorPrefix(message: string): string {
  return message.replace(/^Contenido de juego inválido:\s*/i, '');
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unreadableFilesReason(files: SourceFile[]): string {
  const onlyImages = files.length > 0 && files.every((file) => file.mimeType.startsWith('image/'));
  return onlyImages
    ? 'la IA no pudo leer el contenido de las imágenes en este momento. Escribe el tema o sube un documento con texto.'
    : 'no se pudo extraer texto de los archivos subidos y no escribiste ningún tema.';
}

function unreadableNotice(unreadable: string[]): string | null {
  if (unreadable.length === 0) return null;
  const names = unreadable.slice(0, 3).join(', ');
  const rest = unreadable.length > 3 ? ` y ${unreadable.length - 3} más` : '';
  return `No se pudo leer: ${names}${rest}.`;
}

function truncatedNotice(truncated: boolean): string | null {
  return truncated ? 'Tu texto era muy largo: la IA usó solo la primera parte.' : null;
}

function withNotice(
  draft: { config: Record<string, unknown>; content: unknown[] },
  notices: Array<string | null>,
): GenerateGameDraftOutput {
  const notice = notices.filter(Boolean).join(' ');
  return notice ? { ...draft, notice } : draft;
}

/**
 * Qué decirle a la IA de una imagen: lo que leyó la visión (más el nombre del
 * archivo si dice algo), o — si no se pudo leer — solo el nombre del archivo.
 */
function composeImageDescription(image: ImageDescription, filename: string): string {
  const hint = meaningfulFileLabel(filename);
  if (image.ok) return hint ? `${image.description} (archivo: ${hint})` : image.description;
  return hint
    ? `(no se pudo leer la imagen; por el nombre del archivo parece ser: "${hint}")`
    : '(no se pudo leer esta imagen y su nombre de archivo no dice qué es — guíate por las instrucciones del usuario)';
}

/** El nombre del archivo sin extensión, si dice algo (no es "IMG_0231", "captura", etc.). */
function meaningfulFileLabel(filename: string): string | null {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const letters = base.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3 || GENERIC_FILE_NAME.test(base)) return null;
  return base.slice(0, 80);
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
        `la IA referenció una imagen inválida en el elemento ${position} (imageIndex debe ser un número entre 0 y ${imageUrls.length - 1}).`,
      );
    }

    const { imageIndex: _imageIndex, ...rest } = raw;
    return { ...rest, imageUrl: imageUrls[index as number] };
  });
}

/**
 * Fuerza "imageUrl": null y descarta cualquier "imageIndex" que el modelo haya
 * devuelto de más (aunque se le pidió que no lo hiciera) — camino sin ninguna
 * imagen del usuario (issue #238). Conserva `imageQuery`/`emoji`/`color`, que
 * `extractImageNeeds` necesita para conseguir las imágenes.
 */
function withoutImageUrls(content: unknown): unknown {
  if (!Array.isArray(content)) return content;

  return content.map((item) => {
    if (typeof item !== 'object' || item === null) return item;
    const { imageIndex: _imageIndex, ...rest } = item as Record<string, unknown>;
    return { ...rest, imageUrl: null };
  });
}

/**
 * Qué necesita cada elemento para conseguirle una imagen, en el mismo orden
 * que `content`: la búsqueda que propuso el modelo (o el `label` si no mandó
 * ninguna), y el emoji y color para la ilustración de respaldo.
 */
function extractImageNeeds(content: unknown): ImageNeed[] {
  if (!Array.isArray(content)) return [];
  return content.map((item) => {
    const raw = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const label = typeof raw.label === 'string' ? raw.label.trim() : '';
    const query = typeof raw.imageQuery === 'string' && raw.imageQuery.trim() ? raw.imageQuery.trim() : label;
    return {
      label,
      query: query ? query.slice(0, 200) : null,
      emoji: sanitizeEmoji(raw.emoji),
      color: typeof raw.color === 'string' ? raw.color : null,
    };
  });
}
