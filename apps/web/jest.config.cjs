/** @type {import('jest').Config} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCjsPreset } = require('jest-preset-angular/presets');

// The CJS preset (rather than ESM) is required on Node < 24.9: Jest's
// `require(ESM)` bridge for Angular's fesm2022 bundles only exists on newer
// Node. The CJS preset transforms Angular/NgRx/rxjs ESM via ts-jest instead.
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
