import { Inject, Injectable } from '@nestjs/common';
import {
  AI_CONTENT_ASSISTANT,
  type AiContentAssistant,
} from '../../domain/ports/ai-content-assistant.port.js';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import type { UseCase } from '../ports/use-case.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { resolveGamePromptSpec } from '../ai/game-prompt-catalog.js';
import { FileTextExtractor, type SourceFile } from '../../infrastructure/ai/file-text-extractor.js';

export interface GenerateGameDraftInput {
  gameType: string;
  files: SourceFile[];
}

export interface GenerateGameDraftOutput {
  config: Record<string, unknown>;
  content: unknown[];
}

const MAX_FILES = 5;

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
 */
@Injectable()
export class GenerateGameDraftUseCase
  implements UseCase<GenerateGameDraftInput, GenerateGameDraftOutput>
{
  constructor(
    @Inject(AI_CONTENT_ASSISTANT) private readonly aiContentAssistant: AiContentAssistant,
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
    const spec = resolveGamePromptSpec(gameType.getName());
    if (!spec) {
      throw new InvalidGameContentError(
        `el asistente de IA todavía no está disponible para "${input.gameType}".`,
      );
    }

    const sourceText = await this.fileTextExtractor.extractAll(input.files);
    if (!sourceText.trim()) {
      throw new InvalidGameContentError('no se pudo extraer texto de los archivos subidos.');
    }

    const draft = await this.aiContentAssistant.generateGameDraft({
      gameType: gameType.getName(),
      sourceText,
      instructions: `${spec.instructions}\n\nForma de JSON esperada:\n${spec.jsonShapeExample}`,
    });

    const validator = this.contentValidators.resolve(gameType.getName());
    const config = validator.validateConfig(draft.config);
    const content = validator.validateContent(draft.content, config);

    return { config, content };
  }
}
