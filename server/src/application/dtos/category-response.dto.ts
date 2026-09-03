import { Category } from '../../domain/entities/category.entity.js';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface CategoryWithGameCountDto extends CategoryDto {
  gameCount: number;
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    createdAt: category.createdAt,
  };
}
