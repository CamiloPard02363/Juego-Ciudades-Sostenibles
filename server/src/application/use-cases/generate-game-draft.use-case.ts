import { Inject, Injectable } from '@nestjs/common';
import {
  AI_CONTENT_ASSISTANT,
  type AiContentAssistant,
} from '../../domain/ports/ai-content-assistant.port.js';
import { IMAGE_STORAGE, type ImageStorage } from '../../domain/ports/image-storage.port.js';
import {
  CONTENT_IMAGE_FINDER,
  type ContentImageFinder,
} from '../../domain/ports/content-image-finder.port.js';
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
  /**
   * Instrucción libre del usuario para guiar a la IA (p. ej. "enfócate en el
   * capítulo 3", o directamente el tema completo del juego) — puede ser la
   * ÚNICA fuente de contenido si `files` viene vacío, en CUALQUIER tipo de
   * juego (issues #234/#238). Para los tipos con imagen obligatoria por
   * elemento (Quién Es, Parejas), la IA además consigue una imagen para cada
   * elemento (issue #240, ver `ContentImageFinder`); las que no encuentre
   * quedan sin imagen (`imageUrl: null`) para que el usuario las agregue a
   * mano.
   */
  message?: string;
  /**
   * Puede venir vacío siempre que `message` traiga texto (issues #234/#238)
   * — `execute()` es quien decide, según el `GamePromptSpec`, si eso implica
   * generar sin imágenes o directamente sin ninguna fuente visual.
   */
  files: SourceFile[];
}

export interface GenerateGameDraftOutput {
  config: Record<string, unknown>;
  content: unknown[];
  /**
   * Aviso opcional para mostrarle al usuario junto con el borrador (p. ej.
   * cuántas imágenes consiguió la IA y cuántas faltan completar a mano).
   */
  notice?: string;
}

const MAX_FILES = 65;
/** Búsquedas/descargas de imágenes en paralelo como máximo (cortesía con la fuente externa). */
const IMAGE_SEARCH_CONCURRENCY = 4;

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
 * IA nunca inventa esas imágenes. Lo normal es que el profesor suba sus
 * propias imágenes junto con los demás archivos — sueltas, o dentro de un
 * PDF/Word con varias fotos adentro (se extraen automáticamente, ver
 * `content-image-extractor.ts`, issue #208) — y este caso de uso las sube a
 * Cloudinary (mismo `ImageStorage` que usa la subida manual) y le pide al
 * modelo que las "organice" — que les asigne un concepto — referenciándolas
 * por posición ("imageIndex") en vez de por URL, y luego reemplaza cada
 * índice por la URL real ya subida antes de validar. Pero si no sube NINGUNA
 * imagen y en cambio escribe el tema en `message` (issue #238), la IA genera
 * igual el contenido completo (labels/info/config) solo con ese texto y,
 * además (issue #240), consigue ella misma una imagen real para cada
 * elemento: el modelo propone una búsqueda por elemento (`imageQuery`) y
 * `ContentImageFinder` la resuelve en una fuente de imágenes libres; cada
 * imagen encontrada se sube a Cloudinary igual que una subida manual. Las
 * que no encuentre quedan con `imageUrl: null` — el usuario las completa a
 * mano en el formulario de siempre antes de poder crear/guardar el juego de
 * verdad (ahí el validador vuelve a exigirla, sin excepción).
 *
 * Tipos de juego SIN imagen obligatoria (Dominó, Laberinto, Escaleras,
 * Opuestos, Dúo Lógico — issue #234): acá `files` es opcional de verdad. El
 * usuario puede escribir solo el tema/instrucciones en `message` sin adjuntar
 * nada, y la IA genera el juego completo a partir de ese texto.
 *
 * En resumen (issues #234/#238): nunca es obligatorio adjuntar un archivo
 * para poder generar un borrador, en ningún tipo de juego — pero sí se exige
 * al menos UNA de las dos fuentes (archivos o mensaje), nunca ninguna.
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
    @Inject(CONTENT_IMAGE_FINDER) private readonly contentImageFinder: ContentImageFinder,
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

    if (spec.imageRequirement) {
      // Sin archivos NI mensaje no hay nada de dónde partir — con mensaje
      // (issue #238), `executeWithContentImages` genera igual sin ninguna
      // imagen si no encuentra ninguna entre los archivos.
      if (input.files.length === 0 && !input.message?.trim()) {
        throw new InvalidGameContentError(
          'sube al menos un archivo o escribe el tema para generar el juego.',
        );
      }
      return this.executeWithContentImages(gameType.getName(), spec, input.files, input.message);
    }

    // Sin imagen obligatoria (issue #234): basta con UNA de las dos fuentes
    // — archivos o un mensaje de texto — nunca ninguna de las dos.
    if (input.files.length === 0 && !input.message?.trim()) {
      throw new InvalidGameContentError(
        'sube al menos un archivo o escribe el tema/instrucciones para generar el juego.',
      );
    }
    return this.executeTextOnly(gameType.getName(), spec, input.files, input.message);
  }

  /**
   * Tipos de juego sin imagen obligatoria (Dominó, Laberinto, Escaleras,
   * Opuestos, Dual Quest…). `files` puede venir vacío (issue #234): sin
   * archivos, `sourceText` queda vacío y la IA genera el juego completo
   * usando únicamente `message` como fuente — `execute()` ya garantizó que
   * al menos una de las dos (archivos o mensaje) llegó con algo.
   */
  private async executeTextOnly(
    gameTypeName: GameTypeName,
    spec: GamePromptSpec,
    files: SourceFile[],
    message: string | undefined,
  ): Promise<GenerateGameDraftOutput> {
    const sourceText = files.length > 0 ? await this.fileTextExtractor.extractAll(files) : '';
    if (!sourceText.trim() && !message?.trim()) {
      throw new InvalidGameContentError(
        'no se pudo extraer texto de los archivos subidos y no escribiste ningún tema.',
      );
    }

    const draft = await this.aiContentAssistant.generateGameDraft({
      gameType: gameTypeName,
      sourceText:
        sourceText.trim() ||
        '(el usuario no adjuntó archivos — genera el juego únicamente a partir de las instrucciones de abajo.)',
      instructions: buildInstructions(spec, message),
    });

    const content =
      gameTypeName === 'MEMORY_MATCH' ? normalizeOppositesImageFields(draft.content) : draft.content;
    return this.validate(gameTypeName, draft.config, content);
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
      // Sin ninguna imagen (ni suelta ni incrustada) — issue #238: si el
      // usuario escribió un tema, la IA genera igual el contenido completo
      // sin imágenes, para que él las agregue a mano después. Sin mensaje,
      // no hay nada de dónde partir.
      if (message?.trim()) {
        return this.executeImageRequirementTextOnly(gameTypeName, spec, documentFiles, message);
      }
      throw new InvalidGameContentError(
        'sube al menos una imagen — suelta, o dentro de un PDF/Word (la IA las extrae automáticamente) — o escribe el tema para que la IA arme el contenido y lo completes con imágenes después.',
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
    return this.validate(gameTypeName, draft.config, content);
  }

  /**
   * Tipos con imagen obligatoria por elemento (Quién Es, Parejas), pero SIN
   * ninguna imagen disponible todavía (issue #238): la IA genera el
   * contenido completo (labels/info/config) solo con el tema que escribe el
   * usuario, usando `spec.textOnlyInstructions`/`textOnlyJsonShapeExample`
   * en vez de las instrucciones normales (que darían por hecho que hay
   * imágenes que organizar).
   *
   * Imágenes (issue #240): el modelo devuelve un `imageQuery` por elemento y
   * `fillImagesFromQueries` consigue y sube una imagen para cada uno. Las
   * que no aparezcan quedan con `imageUrl: null` — el mismo validador, en
   * modo borrador (`isDraft`, ver `validate()`), lo permite; el usuario
   * completa esas a mano antes de poder crear/guardar el juego de verdad.
   */
  private async executeImageRequirementTextOnly(
    gameTypeName: GameTypeName,
    spec: GamePromptSpec,
    documentFiles: SourceFile[],
    message: string,
  ): Promise<GenerateGameDraftOutput> {
    const sourceText = documentFiles.length > 0 ? await this.fileTextExtractor.extractAll(documentFiles) : '';

    const draft = await this.aiContentAssistant.generateGameDraft({
      gameType: gameTypeName,
      sourceText:
        sourceText.trim() ||
        '(el usuario no adjuntó archivos — genera el contenido únicamente a partir de las instrucciones de abajo.)',
      instructions: buildInstructions(
        {
          instructions: spec.textOnlyInstructions ?? spec.instructions,
          jsonShapeExample: spec.textOnlyJsonShapeExample ?? spec.jsonShapeExample,
        },
        message,
      ),
    });

    const queries = extractImageQueries(draft.content);
    const content = normalizeMissingImageFields(draft.content);
    // Validar primero sin imágenes: si el contenido del modelo no sirve, se
    // rechaza antes de gastar búsquedas/descargas/subidas.
    const withoutImages = this.validate(gameTypeName, draft.config, content);
    if (!Array.isArray(content) || content.length === 0) return withoutImages;

    const folder = spec.contentImageFolder ?? 'ai-game-content';
    const imageUrls = await this.fillImagesFromQueries(queries, folder);
    const found = imageUrls.filter(Boolean).length;
    if (found === 0) {
      return {
        ...withoutImages,
        notice:
          'La IA armó el contenido, pero no encontró imágenes para este tema — agrega la imagen de cada elemento a mano.',
      };
    }

    const contentWithImages = content.map((item, index) =>
      typeof item === 'object' && item !== null ? { ...item, imageUrl: imageUrls[index] ?? null } : item,
    );
    const missing = content.length - found;
    return {
      ...this.validate(gameTypeName, draft.config, contentWithImages),
      notice:
        missing === 0
          ? `La IA consiguió las ${found} imágenes en Wikimedia Commons — revisa que cada una corresponda.`
          : `La IA consiguió ${found} de ${content.length} imágenes en Wikimedia Commons — agrega a mano las ${missing} que faltan.`,
    };
  }

  /**
   * Una imagen por elemento a partir de su búsqueda (`null` si no hay
   * búsqueda, no se encontró nada o falló la descarga/subida — nunca lanza).
   * Nunca repite la misma imagen en dos elementos: cada candidato se
   * reserva de forma síncrona antes de descargarlo, así dos búsquedas en
   * paralelo no pueden quedarse con el mismo.
   */
  private async fillImagesFromQueries(
    queries: Array<{ query: string; label: string } | null>,
    folder: string,
  ): Promise<Array<string | null>> {
    const reserved = new Set<string>();
    return mapWithConcurrency(queries, IMAGE_SEARCH_CONCURRENCY, async (entry) => {
      if (!entry) return null;
      const candidates = await this.contentImageFinder.search(entry.query, entry.label);
      for (const candidate of candidates) {
        const key = candidate.url.split('?')[0];
        if (reserved.has(key)) continue;
        reserved.add(key);
        const image = await this.contentImageFinder.download(candidate);
        if (!image) continue;
        try {
          const uploaded = await this.imageStorage.upload(image.buffer, folder);
          return uploaded.url;
        } catch {
          // Sin almacenamiento disponible no tiene sentido seguir probando
          // candidatos: el elemento queda sin imagen para completarlo a mano.
          return null;
        }
      }
      return null;
    });
  }

  private validate(
    gameTypeName: GameTypeName,
    config: unknown,
    content: unknown,
  ): GenerateGameDraftOutput {
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

/**
 * Fuerza "imageUrl": null (y descarta cualquier "imageIndex" que el modelo
 * haya devuelto de más, aunque se le pidió que no lo hiciera) en cada
 * elemento — issue #238, camino sin ninguna imagen disponible para Quién Es
 * y Parejas. Mismo patrón que `normalizeOppositesImageFields`, para cuando
 * se genera sin imágenes en vez de sin ellas por diseño.
 */
function normalizeMissingImageFields(content: unknown): unknown {
  if (!Array.isArray(content)) return content;

  return content.map((item) => {
    if (typeof item !== 'object' || item === null) return item;
    const raw = item as Record<string, unknown>;
    const { imageIndex: _imageIndex, imageQuery: _imageQuery, ...rest } = raw;
    return { ...rest, imageUrl: null };
  });
}

/**
 * Búsqueda de imagen que propuso el modelo para cada elemento (issue #240),
 * en el mismo orden que `content`. Si el modelo no mandó `imageQuery`, se
 * usa el `label` como búsqueda; `null` si no hay ninguno de los dos.
 */
function extractImageQueries(content: unknown): Array<{ query: string; label: string } | null> {
  if (!Array.isArray(content)) return [];
  return content.map((item) => {
    if (typeof item !== 'object' || item === null) return null;
    const raw = item as Record<string, unknown>;
    const label = typeof raw.label === 'string' ? raw.label.trim() : '';
    const query = typeof raw.imageQuery === 'string' && raw.imageQuery.trim() ? raw.imageQuery.trim() : label;
    return query ? { query: query.slice(0, 200), label } : null;
  });
}

/** `Promise.all` con un máximo de tareas simultáneas; conserva el orden de `items`. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
