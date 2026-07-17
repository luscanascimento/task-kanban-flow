import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import { opt } from '../util/dto.js';

export type ApiKeyScope = 'read' | 'read_write';

/** Public (non-secret) view of a key — safe to list. Never includes the hash. */
export interface ApiKeyDto {
  readonly id: string;
  readonly name: string;
  readonly display: string;
  readonly scope: ApiKeyScope;
  readonly createdAt: string;
  readonly lastUsedAt?: string;
  readonly revoked: boolean;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  display: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  deleted_at: string | null;
}

export interface CreateApiKeyInput {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  display: string;
  scope: ApiKeyScope;
}

function toDto(row: ApiKeyRow): ApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    display: row.display,
    scope: row.scope as ApiKeyScope,
    createdAt: row.created_at,
    ...opt('lastUsedAt', row.last_used_at),
    revoked: row.deleted_at !== null,
  };
}

export interface ApiKeysRepo {
  create(input: CreateApiKeyInput): ApiKeyDto;
  listByUser(userId: string): ApiKeyDto[];
  /** Returns the key ONLY if it exists and is not soft-deleted. */
  resolveActiveByHash(
    keyHash: string,
  ): { id: string; userId: string; scope: ApiKeyScope } | undefined;
  touchLastUsed(id: string): void;
  /** Soft-delete: sets deleted_at. Returns true if a live key was revoked. */
  revoke(id: string, userId: string): boolean;
}

export function createApiKeysRepo(db: Db): ApiKeysRepo {
  const insert = db.prepare<[string, string, string, string, string, string, string]>(
    `INSERT INTO api_keys (id, user_id, name, key_hash, display, scope, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(`SELECT * FROM api_keys WHERE id = ?`);
  const listForUser = db.prepare<[string]>(
    `SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
  );
  // The validity rule, enforced in SQL: exists AND not soft-deleted.
  const activeByHash = db.prepare<[string]>(
    `SELECT id, user_id, scope FROM api_keys WHERE key_hash = ? AND deleted_at IS NULL`,
  );
  const touch = db.prepare<[string, string]>(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`);
  const softDelete = db.prepare<[string, string, string]>(
    `UPDATE api_keys SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
  );

  return {
    create(input) {
      insert.run(
        input.id,
        input.userId,
        input.name,
        input.keyHash,
        input.display,
        input.scope,
        nowIso(),
      );
      return toDto(byId.get(input.id) as ApiKeyRow);
    },
    listByUser(userId) {
      return (listForUser.all(userId) as ApiKeyRow[]).map(toDto);
    },
    resolveActiveByHash(keyHash) {
      const row = activeByHash.get(keyHash) as
        | { id: string; user_id: string; scope: string }
        | undefined;
      return row ? { id: row.id, userId: row.user_id, scope: row.scope as ApiKeyScope } : undefined;
    },
    touchLastUsed(id) {
      touch.run(nowIso(), id);
    },
    revoke(id, userId) {
      return softDelete.run(nowIso(), id, userId).changes > 0;
    },
  };
}
