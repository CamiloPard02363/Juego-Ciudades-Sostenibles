import { User } from '../entities/user.entity.js';
import { Email } from '../value-objects/email.vo.js';
import { RoleName } from '../value-objects/role.vo.js';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface FindAllUsersFilter {
  role?: RoleName;
  isActive?: boolean;
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
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  findAll(filter: FindAllUsersFilter): Promise<PaginatedResult<User>>;
  delete(id: string): Promise<void>;
}
