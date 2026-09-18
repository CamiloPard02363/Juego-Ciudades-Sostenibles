import { describe, expect, it, vi } from 'vitest';
import { InvalidGameContentError } from '../../domain/errors/game.errors.js';
import type {
  AiContentAssistant,
  GenerateGameDraftOutput,
} from '../../domain/ports/ai-content-assistant.port.js';
import { ContentValidatorRegistry } from '../content-validators/content-validator.registry.js';
import { MemoryMatchContentValidator } from '../content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../content-validators/dual-quest.content-validator.js';
import { DualQuestPixiContentValidator } from '../content-validators/dual-quest-pixi.content-validator.js';
import { FileTextExtractor, type SourceFile } from '../../infrastructure/ai/file-text-extractor.js';
import { GenerateGameDraftUseCase } from './generate-game-draft.use-case.js';

function buildRegistry(): ContentValidatorRegistry {
  return new ContentValidatorRegistry(
    new MemoryMatchContentValidator(),
    new GuessWhoContentValidator(),
    new DominoContentValidator(),
    new MazeCollectorContentValidator(),
    new SnakesLaddersContentValidator(),
    new DualQuestContentValidator(),
    new DualQuestPixiContentValidator(),
  );
}

function fakeAssistant(draft: GenerateGameDraftOutput): AiContentAssistant {
  return {
    describeImage: vi.fn().mockResolvedValue('texto de la imagen'),
    generateGameDraft: vi.fn().mockResolvedValue(draft),
  };
}

function csvFile(text: string): SourceFile {
  return { buffer: Buffer.from(text, 'utf-8'), mimeType: 'text/csv', filename: 'tema.csv' };
}

const VALID_DOMINO_DRAFT: GenerateGameDraftOutput = {
  config: { handSize: 7 },
  content: [
    { label: 'Paneles solares', icon: 'star', color: '#22c55e' },
    { label: 'Turbinas eólicas', icon: 'star', color: '#3b82f6' },
    { label: 'Biomasa', icon: 'star', color: '#a16207' },
    { label: 'Hidroeléctrica', icon: 'star', color: '#0ea5e9' },
    { label: 'Geotermia', icon: 'star', color: '#f97316' },
    { label: 'Mareomotriz', icon: 'star', color: '#6366f1' },
  ],
};

describe('GenerateGameDraftUseCase', () => {
  it('genera y valida un borrador de DOMINO a partir de un archivo', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    const useCase = new GenerateGameDraftUseCase(
      assistant,
      new FileTextExtractor(assistant),
      buildRegistry(),
    );

    const result = await useCase.execute({
      gameType: 'DOMINO',
      files: [csvFile('concepto,descripcion\nEnergía solar,...')],
    });

    expect(result.config).toEqual({ handSize: 7 });
    expect(result.content).toHaveLength(6);
  });

  it('rechaza un borrador que la IA devolvió inválido, con el mismo validador que la creación manual', async () => {
    const assistant = fakeAssistant({ config: { handSize: 999 }, content: VALID_DOMINO_DRAFT.content });
    const useCase = new GenerateGameDraftUseCase(
      assistant,
      new FileTextExtractor(assistant),
      buildRegistry(),
    );

    await expect(
      useCase.execute({ gameType: 'DOMINO', files: [csvFile('a,b')] }),
    ).rejects.toThrow(InvalidGameContentError);
  });

  it('rechaza gameType que el asistente de IA todavía no soporta, sin llamar a la IA', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    const useCase = new GenerateGameDraftUseCase(
      assistant,
      new FileTextExtractor(assistant),
      buildRegistry(),
    );

    await expect(
      useCase.execute({ gameType: 'GUESS_WHO', files: [csvFile('a,b')] }),
    ).rejects.toThrow(InvalidGameContentError);
    expect(assistant.generateGameDraft).not.toHaveBeenCalled();
  });

  it('rechaza si no se sube ningún archivo', async () => {
    const assistant = fakeAssistant(VALID_DOMINO_DRAFT);
    const useCase = new GenerateGameDraftUseCase(
      assistant,
      new FileTextExtractor(assistant),
      buildRegistry(),
    );

    await expect(useCase.execute({ gameType: 'DOMINO', files: [] })).rejects.toThrow(
      InvalidGameContentError,
    );
  });
});
