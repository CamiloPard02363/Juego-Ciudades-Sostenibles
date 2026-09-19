import { User } from '../entities/user.entity.js';
import { Email } from '../value-objects/email.vo.js';
import { RoleName } from '../value-objects/role.vo.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface FindAllUsersFilter {
  role?: RoleName;
  isActive?: boolean;
  /** Substring case-insensitive contra nombre (displayName) o email (issue #106, CA2.1). */
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  findAll(filter: FindAllUsersFilter): Promise<PaginatedResult<User>>;
  delete(id: string): Promise<void>;
}
