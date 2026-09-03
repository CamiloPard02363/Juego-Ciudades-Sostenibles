import { Category } from '../../../domain/entities/category.entity.js';

export interface CategoryDocument {
  _id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export class CategoryMapper {
  static toDomain(doc: CategoryDocument): Category {
    return Category.fromPersistence({
      id: doc._id,
      name: doc.name,
      slug: doc.slug,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(category: Category): CategoryDocument {
    const props = category.toPersistence();

    return {
      _id: props.id,
      name: props.name,
      slug: props.slug,
      createdAt: props.createdAt,
    };
  }
}
