import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type {
  CreateProjectSecretRequestDto,
  SecretAuthType,
  UpdateProjectSecretRequestDto,
} from '@tkf/shared-types';
import { encryptSecret } from '../crypto/encryption.js';
import { opt } from '../util/dto.js';

/**
 * Public view of a secret — deliberately WITHOUT the credential value. The API
 * never returns the decrypted `secret`; values are encrypted at rest and can
 * only be used by systems that hold the encryption key, not read back over HTTP.
 */
export interface SecretMetadataDto {
  readonly id: string;
  readonly boardId: string;
  readonly clientId?: string;
  readonly platform: string;
  readonly label: string;
  readonly authType: SecretAuthType;
  readonly username?: string;
  readonly url?: string;
  readonly notes?: string;
  readonly hasValue: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface SecretRow {
  id: string;
  board_id: string;
  client_id: string | null;
  platform: string;
  label: string;
  auth_type: string;
  username: string | null;
  secret_encrypted: string;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toMetadata(row: SecretRow): SecretMetadataDto {
  return {
    id: row.id,
    boardId: row.board_id,
    ...opt('clientId', row.client_id),
    platform: row.platform,
    label: row.label,
    authType: row.auth_type as SecretAuthType,
    ...opt('username', row.username),
    ...opt('url', row.url),
    ...opt('notes', row.notes),
    hasValue: row.secret_encrypted.length > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SecretsRepo {
  listByBoard(boardId: string): SecretMetadataDto[];
  get(id: string): SecretMetadataDto | undefined;
  create(id: string, input: CreateProjectSecretRequestDto): SecretMetadataDto;
  update(id: string, input: UpdateProjectSecretRequestDto): SecretMetadataDto | undefined;
  remove(id: string): boolean;
}

export function createSecretsRepo(db: Db, encKey: Buffer): SecretsRepo {
  const insert = db.prepare<
    [
      string,
      string,
      string | null,
      string,
      string,
      string,
      string | null,
      string,
      string | null,
      string | null,
      string,
      string,
    ]
  >(
    `INSERT INTO secrets (id, board_id, client_id, platform, label, auth_type, username, secret_encrypted, url, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(`SELECT * FROM secrets WHERE id = ?`);
  const byBoard = db.prepare<[string]>(
    `SELECT * FROM secrets WHERE board_id = ? ORDER BY created_at`,
  );
  const del = db.prepare<[string]>(`DELETE FROM secrets WHERE id = ?`);

  return {
    listByBoard(boardId) {
      return (byBoard.all(boardId) as SecretRow[]).map(toMetadata);
    },
    get(id) {
      const row = byId.get(id) as SecretRow | undefined;
      return row ? toMetadata(row) : undefined;
    },
    create(id, input) {
      const ts = nowIso();
      insert.run(
        id,
        input.boardId,
        input.clientId ?? null,
        input.platform,
        input.label,
        input.authType,
        input.username ?? null,
        encryptSecret(input.secret, encKey),
        input.url ?? null,
        input.notes ?? null,
        ts,
        ts,
      );
      return toMetadata(byId.get(id) as SecretRow);
    },
    update(id, input) {
      const existing = byId.get(id) as SecretRow | undefined;
      if (!existing) {
        return undefined;
      }
      const clientId = input.clientId === undefined ? existing.client_id : input.clientId;
      const encrypted =
        input.secret === undefined
          ? existing.secret_encrypted
          : encryptSecret(input.secret, encKey);
      db.prepare(
        `UPDATE secrets SET client_id = ?, platform = ?, label = ?, auth_type = ?, username = ?, secret_encrypted = ?, url = ?, notes = ?, updated_at = ? WHERE id = ?`,
      ).run(
        clientId,
        input.platform ?? existing.platform,
        input.label ?? existing.label,
        input.authType ?? existing.auth_type,
        input.username ?? existing.username,
        encrypted,
        input.url ?? existing.url,
        input.notes ?? existing.notes,
        nowIso(),
        id,
      );
      return toMetadata(byId.get(id) as SecretRow);
    },
    remove(id) {
      return del.run(id).changes > 0;
    },
  };
}
