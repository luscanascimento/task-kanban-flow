import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type {
  CreateTeamRequestDto,
  TeamDto,
  TeamMemberDto,
  TeamRole,
  UpdateTeamRequestDto,
  UserDto,
} from '@tkf/shared-types';
import { opt } from '../util/dto.js';

interface TeamRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
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

function memberToDto(row: MemberRow): TeamMemberDto {
  const user: UserDto = {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name,
    ...opt('avatarUrl', row.avatar_url),
    role: row.u_role as UserDto['role'],
    createdAt: row.u_created_at,
    updatedAt: row.u_updated_at,
  };
  return { user, role: row.role as TeamRole, joinedAt: row.joined_at };
}

export interface TeamsRepo {
  list(): TeamDto[];
  get(id: string): TeamDto | undefined;
  create(id: string, ownerId: string, input: CreateTeamRequestDto): TeamDto;
  update(id: string, input: UpdateTeamRequestDto): TeamDto | undefined;
  remove(id: string): boolean;
  addMember(teamId: string, userId: string, role: TeamRole): void;
  removeMember(teamId: string, userId: string): boolean;
}

export function createTeamsRepo(db: Db): TeamsRepo {
  const insert = db.prepare<[string, string, string | null, string, string, string]>(
    `INSERT INTO teams (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(`SELECT * FROM teams WHERE id = ?`);
  const listAll = db.prepare(`SELECT * FROM teams ORDER BY name COLLATE NOCASE`);
  const del = db.prepare<[string]>(`DELETE FROM teams WHERE id = ?`);
  const boardCount = db.prepare<[string]>(`SELECT COUNT(*) AS n FROM boards WHERE team_id = ?`);
  const membersFor = db.prepare<[string]>(
    `SELECT tm.user_id, tm.role, tm.joined_at,
            u.email, u.display_name, u.avatar_url,
            u.role AS u_role, u.created_at AS u_created_at, u.updated_at AS u_updated_at
     FROM team_members tm JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ? ORDER BY tm.joined_at`,
  );
  const upsertMember = db.prepare<[string, string, string, string]>(
    `INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(team_id, user_id) DO UPDATE SET role = excluded.role`,
  );
  const delMember = db.prepare<[string, string]>(
    `DELETE FROM team_members WHERE team_id = ? AND user_id = ?`,
  );

  function toDto(row: TeamRow): TeamDto {
    const members = (membersFor.all(row.id) as MemberRow[]).map(memberToDto);
    const { n } = boardCount.get(row.id) as { n: number };
    return {
      id: row.id,
      name: row.name,
      ...opt('description', row.description),
      ownerId: row.owner_id,
      members,
      boardCount: n,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {
    list() {
      return (listAll.all() as TeamRow[]).map(toDto);
    },
    get(id) {
      const row = byId.get(id) as TeamRow | undefined;
      return row ? toDto(row) : undefined;
    },
    create(id, ownerId, input) {
      const ts = nowIso();
      insert.run(id, input.name, input.description ?? null, ownerId, ts, ts);
      upsertMember.run(id, ownerId, 'owner', ts);
      return toDto(byId.get(id) as TeamRow);
    },
    update(id, input) {
      const existing = byId.get(id) as TeamRow | undefined;
      if (!existing) {
        return undefined;
      }
      db.prepare(`UPDATE teams SET name = ?, description = ?, updated_at = ? WHERE id = ?`).run(
        input.name ?? existing.name,
        input.description ?? existing.description,
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as TeamRow);
    },
    remove(id) {
      return del.run(id).changes > 0;
    },
    addMember(teamId, userId, role) {
      upsertMember.run(teamId, userId, role, nowIso());
    },
    removeMember(teamId, userId) {
      return delMember.run(teamId, userId).changes > 0;
    },
  };
}
