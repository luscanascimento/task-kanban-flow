import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type { ClientDto, CreateClientRequestDto, UpdateClientRequestDto } from '@tkf/shared-types';
import { opt } from '../util/dto.js';

interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  board_count: number;
}

function toDto(row: ClientRow): ClientDto {
  return {
    id: row.id,
    name: row.name,
    ...opt('company', row.company),
    ...opt('email', row.email),
    ...opt('phone', row.phone),
    ...opt('notes', row.notes),
    ...opt('color', row.color),
    boardCount: row.board_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = `
  SELECT c.*, (SELECT COUNT(*) FROM boards b WHERE b.client_id = c.id) AS board_count
  FROM clients c`;

/** Clients belong to the user who registered them; every query filters on that. */
export interface ClientsRepo {
  list(ownerId: string): ClientDto[];
  get(ownerId: string, id: string): ClientDto | undefined;
  create(id: string, ownerId: string, input: CreateClientRequestDto): ClientDto;
  update(ownerId: string, id: string, input: UpdateClientRequestDto): ClientDto | undefined;
  remove(ownerId: string, id: string): boolean;
}

export function createClientsRepo(db: Db): ClientsRepo {
  const insert = db.prepare<
    [
      string,
      string,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      string,
      string,
      string,
    ]
  >(
    `INSERT INTO clients (id, name, company, email, phone, notes, color, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const listForOwner = db.prepare<[string]>(
    `${SELECT} WHERE c.owner_id = ? ORDER BY c.name COLLATE NOCASE`,
  );
  const byIdForOwner = db.prepare<[string, string]>(`${SELECT} WHERE c.id = ? AND c.owner_id = ?`);
  const del = db.prepare<[string, string]>(`DELETE FROM clients WHERE id = ? AND owner_id = ?`);

  return {
    list(ownerId) {
      return (listForOwner.all(ownerId) as ClientRow[]).map(toDto);
    },
    get(ownerId, id) {
      const row = byIdForOwner.get(id, ownerId) as ClientRow | undefined;
      return row ? toDto(row) : undefined;
    },
    create(id, ownerId, input) {
      const ts = nowIso();
      insert.run(
        id,
        input.name,
        input.company ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.notes ?? null,
        input.color ?? null,
        ownerId,
        ts,
        ts,
      );
      return toDto(byIdForOwner.get(id, ownerId) as ClientRow);
    },
    update(ownerId, id, input) {
      const existing = byIdForOwner.get(id, ownerId) as ClientRow | undefined;
      if (!existing) {
        return undefined;
      }
      const merged = {
        name: input.name ?? existing.name,
        company: input.company ?? existing.company,
        email: input.email ?? existing.email,
        phone: input.phone ?? existing.phone,
        notes: input.notes ?? existing.notes,
        color: input.color ?? existing.color,
      };
      db.prepare(
        `UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, notes = ?, color = ?, updated_at = ? WHERE id = ? AND owner_id = ?`,
      ).run(
        merged.name,
        merged.company,
        merged.email,
        merged.phone,
        merged.notes,
        merged.color,
        nowIso(),
        id,
        ownerId,
      );
      return toDto(byIdForOwner.get(id, ownerId) as ClientRow);
    },
    remove(ownerId, id) {
      return del.run(id, ownerId).changes > 0;
    },
  };
}
