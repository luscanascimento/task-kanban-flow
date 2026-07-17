import type { Db } from '../db/client.js';
import { nowIso } from '../db/client.js';
import type { ColumnDto, CreateColumnRequestDto, UpdateColumnRequestDto } from '@tkf/shared-types';
import { opt } from '../util/dto.js';

interface ColumnRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
  color: string | null;
  wip_limit: number | null;
  created_at: string;
  updated_at: string;
}

function toDto(row: ColumnRow): ColumnDto {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    ...opt('color', row.color),
    ...opt('wipLimit', row.wip_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ColumnsRepo {
  listByBoard(boardId: string): ColumnDto[];
  get(id: string): ColumnDto | undefined;
  create(id: string, input: CreateColumnRequestDto): ColumnDto;
  update(id: string, input: UpdateColumnRequestDto): ColumnDto | undefined;
  reorder(boardId: string, orderedIds: readonly string[]): ColumnDto[];
  remove(id: string): boolean;
}

export function createColumnsRepo(db: Db): ColumnsRepo {
  const insert = db.prepare<[string, string, string, number, string | null, string, string]>(
    `INSERT INTO columns (id, board_id, title, position, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const byId = db.prepare<[string]>(`SELECT * FROM columns WHERE id = ?`);
  const byBoard = db.prepare<[string]>(
    `SELECT * FROM columns WHERE board_id = ? ORDER BY position`,
  );
  const del = db.prepare<[string]>(`DELETE FROM columns WHERE id = ?`);
  const setPosition = db.prepare<[number, string, string]>(
    `UPDATE columns SET position = ?, updated_at = ? WHERE id = ?`,
  );

  return {
    listByBoard(boardId) {
      return (byBoard.all(boardId) as ColumnRow[]).map(toDto);
    },
    get(id) {
      const row = byId.get(id) as ColumnRow | undefined;
      return row ? toDto(row) : undefined;
    },
    create(id, input) {
      const ts = nowIso();
      insert.run(id, input.boardId, input.title, input.position, input.color ?? null, ts, ts);
      return toDto(byId.get(id) as ColumnRow);
    },
    update(id, input) {
      const existing = byId.get(id) as ColumnRow | undefined;
      if (!existing) {
        return undefined;
      }
      db.prepare(
        `UPDATE columns SET title = ?, position = ?, color = ?, wip_limit = ?, updated_at = ? WHERE id = ?`,
      ).run(
        input.title ?? existing.title,
        input.position ?? existing.position,
        input.color ?? existing.color,
        input.wipLimit ?? existing.wip_limit,
        nowIso(),
        id,
      );
      return toDto(byId.get(id) as ColumnRow);
    },
    reorder(boardId, orderedIds) {
      const ts = nowIso();
      const tx = db.transaction((ids: readonly string[]) => {
        ids.forEach((id, index) => setPosition.run(index, ts, id));
      });
      tx(orderedIds);
      return (byBoard.all(boardId) as ColumnRow[]).map(toDto);
    },
    remove(id) {
      return del.run(id).changes > 0;
    },
  };
}
