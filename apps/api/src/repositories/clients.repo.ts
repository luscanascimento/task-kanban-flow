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

export interface ClientsRepo {
  list(): ClientDto[];
  get(id: string): ClientDto | undefined;
  create(id: string, input: CreateClientRequestDto): ClientDto;
  update(id: string, input: UpdateClientRequestDto): ClientDto | undefined;
  remove(id: string): boolean;
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
    ]
  >(
    `INSERT INTO clients (id, name, company, email, phone, notes, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const listAll = db.prepare(`${SELECT} ORDER BY c.name COLLATE NOCASE`);
  const byId = db.prepare<[string]>(`${SELECT} WHERE c.id = ?`);
  const del = db.prepare<[string]>(`DELETE FROM clients WHERE id = ?`);

  return {
    list() {
      return (listAll.all() as ClientRow[]).map(toDto);
    },
    get(id) {
      const row = byId.get(id) as ClientRow | undefined;
      return row ? toDto(row) : undefined;
    },
    create(id, input) {
      const ts = nowIso();
      insert.run(
        id,
        input.name,
        input.company ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.notes ?? null,
        input.color ?? null,
        ts,
        ts,
      );
      return toDto(byId.get(id) as ClientRow);
    },
    update(id, input) {
      const existing = byId.get(id) as ClientRow | undefined;
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
        `UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, notes = ?, color = ?, updated_at = ? WHERE id = ?`,
      ).run(
        merged.name,
        merged.company,
        merged.email,
        merged.phone,
        merged.notes,
        merged.color,
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as ClientRow);
    },
    remove(id) {
      return del.run(id).changes > 0;
    },
  };
}
