/** @type {import('jest').Config} */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createEsmPreset } = require('jest-preset-angular/presets');

module.exports = {
  ...createEsmPreset({
    tsconfig: '<rootDir>/tsconfig.spec.json',
    isolatedModules: true,
  }),
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    tslib: 'tslib/tslib.es6.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@tkf/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
};
