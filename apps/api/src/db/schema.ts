/**
 * SQLite schema as a single TS constant (portable across tsx/tsup/jest without
 * shipping a separate .sql asset).
 *
 * All data access uses parameterized prepared statements — never string
 * interpolation — so the app is not exposed to SQL injection. Timestamps are
 * ISO-8601 TEXT; value-object arrays on tasks are JSON TEXT.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id   TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  company    TEXT,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  color      TEXT,
  owner_id   TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  team_id     TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  visibility  TEXT NOT NULL DEFAULT 'workspace',
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id   TEXT REFERENCES clients(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boards_team ON boards(team_id);

CREATE TABLE IF NOT EXISTS board_members (
  board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS columns (
  id         TEXT PRIMARY KEY,
  board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL,
  color      TEXT,
  wip_limit  INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  board_id        TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id       TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'backlog',
  position        INTEGER NOT NULL,
  assignee_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_date        TEXT,
  client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
  labels          TEXT NOT NULL DEFAULT '[]',
  checklist_items TEXT NOT NULL DEFAULT '[]',
  attachments     TEXT NOT NULL DEFAULT '[]',
  comment_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);

CREATE TABLE IF NOT EXISTS secrets (
  id               TEXT PRIMARY KEY,
  board_id         TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  client_id        TEXT REFERENCES clients(id) ON DELETE SET NULL,
  platform         TEXT NOT NULL,
  label            TEXT NOT NULL,
  auth_type        TEXT NOT NULL,
  username         TEXT,
  secret_encrypted TEXT NOT NULL,
  url              TEXT,
  notes            TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_secrets_board ON secrets(board_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  display      TEXT NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'read',
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  deleted_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
`;
