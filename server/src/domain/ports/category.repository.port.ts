import { Category } from '../entities/category.entity.js';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  existsBySlug(slug: string): Promise<boolean>;
  findAll(): Promise<Category[]>;
}
