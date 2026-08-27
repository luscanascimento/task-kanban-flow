import type { Db } from './client.js';
import { newId, openDb } from './client.js';
import { loadEnv, type Env } from '../env.js';
import { createRepositories } from '../repositories/index.js';
import { hashPassword } from '../crypto/password.js';

/** Demo credentials — documented in the guides. Dev/portfolio only. */
const DEMO_PASSWORD = 'password123';

/**
 * Seed a small, representative dataset. Idempotent: if any user already exists
 * the seed is skipped, so it is safe to run on every boot.
 */
export async function seedDatabase(db: Db, env: Env): Promise<void> {
  const repos = createRepositories(db, env.secretsEncKey);
  const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (existing.n > 0) {
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD, env.passwordPepper);
  const demo = repos.users.create({
    id: newId('usr'),
    email: 'demo@example.com',
    displayName: 'Demo User',
    passwordHash,
    role: 'admin',
  });
  const ana = repos.users.create({
    id: newId('usr'),
    email: 'ana@example.com',
    displayName: 'Ana Souza',
    passwordHash,
    role: 'member',
  });
  const bruno = repos.users.create({
    id: newId('usr'),
    email: 'bruno@example.com',
    displayName: 'Bruno Lima',
    passwordHash,
    role: 'manager',
  });

  const team = repos.teams.create(newId('tea'), demo.id, {
    name: 'Acme Digital',
    description: 'Demo team seeded for the API + MCP.',
  });
  repos.teams.addMember(team.id, ana.id, 'member');
  repos.teams.addMember(team.id, bruno.id, 'admin');

  const acme = repos.clients.create(newId('cli'), demo.id, {
    name: 'Acme Corp',
    company: 'Acme Corporation',
    email: 'ops@acme.example',
    color: '#0ea5e9',
  });
  repos.clients.create(newId('cli'), demo.id, {
    name: 'Globex',
    company: 'Globex Inc.',
    color: '#f59e0b',
  });

  const board = repos.boards.create(newId('brd'), demo.id, {
    teamId: team.id,
    title: 'Product Roadmap',
    description: 'Seeded demo board.',
    visibility: 'workspace',
    clientId: acme.id,
  });
  repos.boards.addMember(board.id, ana.id, 'editor');

  const backlog = repos.columns.create(newId('col'), {
    boardId: board.id,
    title: 'Backlog',
    position: 0,
  });
  const inProgress = repos.columns.create(newId('col'), {
    boardId: board.id,
    title: 'In Progress',
    position: 1,
  });
  const done = repos.columns.create(newId('col'), {
    boardId: board.id,
    title: 'Done',
    position: 2,
  });

  repos.tasks.create(newId('tsk'), {
    boardId: board.id,
    columnId: backlog.id,
    title: 'Add keyboard shortcuts for card actions',
    priority: 'high',
    assigneeId: ana.id,
  });
  repos.tasks.create(newId('tsk'), {
    boardId: board.id,
    columnId: inProgress.id,
    title: 'Wire the public REST API',
    priority: 'urgent',
    assigneeId: bruno.id,
    clientId: acme.id,
  });
  repos.tasks.create(newId('tsk'), {
    boardId: board.id,
    columnId: done.id,
    title: 'Extract the mock into a Node service',
    priority: 'medium',
  });

  repos.secrets.create(newId('sec'), {
    boardId: board.id,
    clientId: acme.id,
    platform: 'AWS',
    label: 'Production root',
    authType: 'access_token',
    username: 'acme-ops',
    secret: 'super-secret-demo-value',
    url: 'https://console.aws.amazon.com',
  });
}

// Allow `pnpm seed` to run this standalone.
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  const env = loadEnv();
  const db = openDb(env.databasePath);
  seedDatabase(db, env)
    .then(() => {
      console.warn('[seed] done');
      db.close();
    })
    .catch((err: unknown) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}
