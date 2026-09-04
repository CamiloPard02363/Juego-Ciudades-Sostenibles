import { Category } from '../../../domain/entities/category.entity.js';

export interface CategoryDocument {
  _id: string;
  name: string;
  slug: string;
  creatorUserId: string | null;
  createdAt: Date;
}

export class CategoryMapper {
  static toDomain(doc: CategoryDocument): Category {
    return Category.fromPersistence({
      id: doc._id,
      name: doc.name,
      slug: doc.slug,
      // Categorías creadas antes de rastrear autoría no tienen el campo.
      creatorUserId: doc.creatorUserId ?? null,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(category: Category): CategoryDocument {
    const props = category.toPersistence();

    return {
      _id: props.id,
      name: props.name,
      slug: props.slug,
      creatorUserId: props.creatorUserId,
      createdAt: props.createdAt,
    };
  }
}
