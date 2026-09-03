import { Game, type GameTheme } from '../../../domain/entities/game.entity.js';
import { GameSlug } from '../../../domain/value-objects/game-slug.vo.js';
import { GameStatus } from '../../../domain/value-objects/game-status.vo.js';
import { GameType } from '../../../domain/value-objects/game-type.vo.js';

export interface GameDocument {
  _id: string;
  slug: string;
  title: string;
  description: string;
  gameType: string;
  theme: GameTheme;
  creatorUserId: string;
  status: string;
  config: Record<string, unknown>;
  content: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export class GameMapper {
  static toDomain(doc: GameDocument): Game {
    return Game.fromPersistence({
      id: doc._id,
      slug: GameSlug.create(doc.slug),
      title: doc.title,
      description: doc.description,
      gameType: GameType.create(doc.gameType),
      theme: doc.theme,
      creatorUserId: doc.creatorUserId,
      status: GameStatus.create(doc.status),
      config: doc.config,
      content: doc.content,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(game: Game): GameDocument {
    const props = game.toPersistence();

    return {
      _id: props.id,
      slug: props.slug.getValue(),
      title: props.title,
      description: props.description,
      gameType: props.gameType.getName(),
      theme: props.theme,
      creatorUserId: props.creatorUserId,
      status: props.status.getName(),
      config: props.config,
      content: props.content,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
