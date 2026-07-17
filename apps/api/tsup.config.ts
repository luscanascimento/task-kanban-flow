import { defineConfig } from 'tsup';

/**
 * Bundle the service to a single ESM file so Node can run it without the
 * TS-emit / extension-resolution friction. Native deps (better-sqlite3,
 * @node-rs/argon2) are kept external and loaded from node_modules at runtime.
 */
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist',
  external: ['better-sqlite3', '@node-rs/argon2'],
});
