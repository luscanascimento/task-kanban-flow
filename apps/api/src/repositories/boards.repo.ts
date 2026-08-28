import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type {
  BoardDto,
  BoardMemberDto,
  BoardVisibility,
  CreateBoardRequestDto,
  UpdateBoardRequestDto,
  UserDto,
} from '@tkf/shared-types';
import { opt } from '../util/dto.js';

interface BoardRow {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  visibility: string;
  owner_id: string;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardMemberRow {
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  u_role: string;
  u_created_at: string;
  u_updated_at: string;
}

function memberToDto(row: BoardMemberRow): BoardMemberDto {
  const user: UserDto = {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name,
    ...opt('avatarUrl', row.avatar_url),
    role: row.u_role as UserDto['role'],
    createdAt: row.u_created_at,
    updatedAt: row.u_updated_at,
  };
  return { user, role: row.role as BoardMemberDto['role'], joinedAt: row.joined_at };
}

/**
 * A board is reachable by a user when they are a member of its team or an
 * explicit member of the board itself. Every read and write below is filtered
 * by this predicate in SQL, so a caller can never touch another tenant's data.
 * Placeholders: (userId, userId).
 */
const REACHABLE = `(b.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?)
   OR b.id IN (SELECT board_id FROM board_members WHERE user_id = ?))`;

export interface BoardsRepo {
  list(userId: string, teamId?: string): BoardDto[];
  get(userId: string, id: string): BoardDto | undefined;
  /** True when the user may read/write the board — the guard for columns, tasks and secrets. */
  canAccess(userId: string, boardId: string): boolean;
  /** True when the user is board owner, board admin, or team owner/admin. */
  canAdmin(userId: string, boardId: string): boolean;
  create(id: string, ownerId: string, input: CreateBoardRequestDto): BoardDto;
  update(userId: string, id: string, input: UpdateBoardRequestDto): BoardDto | undefined;
  remove(userId: string, id: string): boolean;
  addMember(boardId: string, userId: string, role: BoardMemberDto['role']): void;
}

export function createBoardsRepo(db: Db): BoardsRepo {
  const insert = db.prepare<
    [string, string, string, string | null, string, string, string | null, string, string]
  >(
    `INSERT INTO boards (id, team_id, title, description, visibility, owner_id, client_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(`SELECT * FROM boards WHERE id = ?`);
  const listForUser = db.prepare<[string, string]>(
    `SELECT b.* FROM boards b WHERE ${REACHABLE} ORDER BY b.created_at`,
  );
  const listForUserByTeam = db.prepare<[string, string, string]>(
    `SELECT b.* FROM boards b WHERE ${REACHABLE} AND b.team_id = ? ORDER BY b.created_at`,
  );
  const byIdForUser = db.prepare<[string, string, string]>(
    `SELECT b.* FROM boards b WHERE b.id = ? AND ${REACHABLE}`,
  );
  const reachable = db.prepare<[string, string, string]>(
    `SELECT 1 AS ok FROM boards b WHERE b.id = ? AND ${REACHABLE}`,
  );
  const adminReachable = db.prepare<[string, string, string, string]>(
    `SELECT 1 AS ok FROM boards b
     WHERE b.id = ? AND (
       b.owner_id = ?
       OR b.id IN (SELECT board_id FROM board_members WHERE user_id = ? AND role = 'admin')
       OR b.team_id IN (SELECT team_id FROM team_members WHERE user_id = ? AND role IN ('owner', 'admin'))
     )`,
  );
  const del = db.prepare<[string]>(`DELETE FROM boards WHERE id = ?`);
  const membersFor = db.prepare<[string]>(
    `SELECT bm.user_id, bm.role, bm.joined_at,
            u.email, u.display_name, u.avatar_url,
            u.role AS u_role, u.created_at AS u_created_at, u.updated_at AS u_updated_at
     FROM board_members bm JOIN users u ON u.id = bm.user_id
     WHERE bm.board_id = ? ORDER BY bm.joined_at`,
  );
  const upsertMember = db.prepare<[string, string, string, string]>(
    `INSERT INTO board_members (board_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(board_id, user_id) DO UPDATE SET role = excluded.role`,
  );

  function toDto(row: BoardRow): BoardDto {
    const members = (membersFor.all(row.id) as BoardMemberRow[]).map(memberToDto);
    return {
      id: row.id,
      teamId: row.team_id,
      title: row.title,
      ...opt('description', row.description),
      visibility: row.visibility as BoardVisibility,
      ownerId: row.owner_id,
      members,
      ...opt('clientId', row.client_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {
    list(userId, teamId) {
      const rows = (
        teamId === undefined
          ? listForUser.all(userId, userId)
          : listForUserByTeam.all(userId, userId, teamId)
      ) as BoardRow[];
      return rows.map(toDto);
    },
    get(userId, id) {
      const row = byIdForUser.get(id, userId, userId) as BoardRow | undefined;
      return row ? toDto(row) : undefined;
    },
    canAccess(userId, boardId) {
      return reachable.get(boardId, userId, userId) !== undefined;
    },
    canAdmin(userId, boardId) {
      return adminReachable.get(boardId, userId, userId, userId) !== undefined;
    },
    create(id, ownerId, input) {
      const ts = nowIso();
      insert.run(
        id,
        input.teamId,
        input.title,
        input.description ?? null,
        input.visibility,
        ownerId,
        input.clientId ?? null,
        ts,
        ts,
      );
      upsertMember.run(id, ownerId, 'admin', ts);
      return toDto(byId.get(id) as BoardRow);
    },
    update(userId, id, input) {
      const existing = byIdForUser.get(id, userId, userId) as BoardRow | undefined;
      if (!existing) {
        return undefined;
      }
      // clientId can be explicitly nulled (null) or left untouched (undefined).
      const clientId = input.clientId === undefined ? existing.client_id : input.clientId;
      db.prepare(
        `UPDATE boards SET title = ?, description = ?, visibility = ?, client_id = ?, updated_at = ? WHERE id = ?`,
      ).run(
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.visibility ?? existing.visibility,
        clientId,
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as BoardRow);
    },
    remove(userId, id) {
      if (!reachable.get(id, userId, userId)) {
        return false;
      }
      return del.run(id).changes > 0;
    },
    addMember(boardId, userId, role) {
      upsertMember.run(boardId, userId, role, nowIso());
    },
  };
}
