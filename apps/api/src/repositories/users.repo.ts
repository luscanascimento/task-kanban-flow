import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type { UserDto, UserRole } from '@tkf/shared-types';
import { opt } from '../util/dto.js';

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role?: UserRole;
  avatarUrl?: string;
}

export interface UserWithHash {
  readonly dto: UserDto;
  readonly passwordHash: string;
}

function toDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    ...opt('avatarUrl', row.avatar_url),
    role: row.role as UserRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UsersRepo {
  create(input: CreateUserInput): UserDto;
  findByEmail(email: string): UserWithHash | undefined;
  findById(id: string): UserDto | undefined;
}

export function createUsersRepo(db: Db): UsersRepo {
  const insert = db.prepare<
    [string, string, string, string | null, string, string, string, string]
  >(
    `INSERT INTO users (id, email, display_name, avatar_url, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const byEmail = db.prepare<[string]>(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`);
  const byId = db.prepare<[string]>(`SELECT * FROM users WHERE id = ?`);

  return {
    create(input) {
      const ts = nowIso();
      insert.run(
        input.id,
        input.email,
        input.displayName,
        input.avatarUrl ?? null,
        input.role ?? 'member',
        input.passwordHash,
        ts,
        ts,
      );
      const row = byId.get(input.id) as UserRow;
      return toDto(row);
    },
    findByEmail(email) {
      const row = byEmail.get(email) as UserRow | undefined;
      return row ? { dto: toDto(row), passwordHash: row.password_hash } : undefined;
    },
    findById(id) {
      const row = byId.get(id) as UserRow | undefined;
      return row ? toDto(row) : undefined;
    },
  };
}
