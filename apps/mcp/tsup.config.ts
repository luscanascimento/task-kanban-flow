import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist',
  // Shebang so the built file can run directly as an MCP stdio binary.
  banner: { js: '#!/usr/bin/env node' },
});
