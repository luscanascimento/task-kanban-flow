/** @type {import('jest').Config} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCjsPreset } = require('jest-preset-angular/presets');

// CJS preset (not ESM) for Node < 24.9 — see apps/web/jest.config.cjs.
module.exports = {
  ...createCjsPreset({
    tsconfig: '<rootDir>/tsconfig.spec.json',
  }),
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    tslib: 'tslib/tslib.es6.js',
    '^@tkf/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
};
