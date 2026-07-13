/** @type {import('jest').Config} */
// The design-system package has no specs yet, so it uses the lightweight SWC
// preset (fast, no Angular compiler). When component specs are added, switch to
// jest-preset-angular's CJS preset like the apps do (see apps/web/jest.config.cjs).
module.exports = {
  preset: '../../jest.preset.cjs',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    '^@tkf/(.*)$': '<rootDir>/../$1/src/index.ts',
  },
};
