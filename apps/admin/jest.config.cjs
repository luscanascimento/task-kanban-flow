/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular/presets/defaults-esm',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  globalSetup: 'jest-preset-angular/global-setup-esm',
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@tkf/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
  },
};
