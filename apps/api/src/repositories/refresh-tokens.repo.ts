import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';

/** Persisted refresh-token state, enabling rotation and revocation. */
export interface RefreshTokensRepo {
  issue(input: { id: string; userId: string; expiresAt: string }): void;
  /** Active = exists, not revoked, not expired. */
  isActive(id: string): boolean;
  /**
   * Exists AND was explicitly revoked (by rotation or logout). Distinct from
   * `!isActive`, which is also true for unknown and merely expired ids.
   */
  isRevoked(id: string): boolean;
  revoke(id: string): void;
  revokeAllForUser(userId: string): void;
}

export function createRefreshTokensRepo(db: Db): RefreshTokensRepo {
  const insert = db.prepare<[string, string, string, string]>(
    `INSERT INTO refresh_tokens (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(
    `SELECT revoked_at, expires_at FROM refresh_tokens WHERE id = ?`,
  );
  const revokeOne = db.prepare<[string, string]>(
    `UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`,
  );
  const revokeUser = db.prepare<[string, string]>(
    `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
  );

  return {
    issue(input) {
      insert.run(input.id, input.userId, input.expiresAt, nowIso());
    },
    isActive(id) {
      const row = byId.get(id) as { revoked_at: string | null; expires_at: string } | undefined;
      if (!row || row.revoked_at !== null) {
        return false;
      }
      return new Date(row.expires_at).getTime() > Date.now();
    },
    isRevoked(id) {
      const row = byId.get(id) as { revoked_at: string | null } | undefined;
      return row !== undefined && row.revoked_at !== null;
    },
    revoke(id) {
      revokeOne.run(nowIso(), id);
    },
    revokeAllForUser(userId) {
      revokeUser.run(nowIso(), userId);
    },
  };
}
