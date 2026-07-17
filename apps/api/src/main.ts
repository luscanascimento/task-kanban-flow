import { buildApp } from './app.js';
import { loadEnv } from './env.js';
import { openDb } from './db/client.js';
import { seedDatabase } from './db/seed.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = openDb(env.databasePath);

  // Seed a demo dataset on first run (no-op if data already exists).
  await seedDatabase(db, env);

  const app = await buildApp({ env, db });

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Task Kanban Flow API on http://${env.host}:${env.port} — docs at /docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void app.close().then(() => process.exit(0));
    });
  }
}

void main();
