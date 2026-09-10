import { Game } from '../../domain/entities/game.entity.js';

export interface GameSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  gameType: string;
  theme: { primaryColor: string; coverImageUrl: string | null };
  categoryId: string;
  status: string;
  creatorUserId: string;
  /** `null` = juego personal; con valor = institucional de esa organización. */
  organizationId: string | null;
  /** Solo se llena en el listado de "Comunidad", donde se muestra quién creó cada juego. */
  creatorDisplayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameDetailDto extends GameSummaryDto {
  config: Record<string, unknown>;
  content: unknown[];
}

export function toGameSummaryDto(game: Game): GameSummaryDto {
  return {
    id: game.id,
    slug: game.slug.getValue(),
    title: game.title,
    description: game.description,
    gameType: game.gameType.getName(),
    theme: game.theme,
    categoryId: game.categoryId,
    status: game.status.getName(),
    creatorUserId: game.creatorUserId,
    organizationId: game.organizationId,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

export function toGameDetailDto(game: Game): GameDetailDto {
  return {
    ...toGameSummaryDto(game),
    config: game.config,
    content: game.content,
  };
}
