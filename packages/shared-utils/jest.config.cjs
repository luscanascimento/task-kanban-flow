/** @type {import('jest').Config} */
module.exports = {
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/lib/**/*.ts', '!src/**/*.spec.ts', '!src/**/index.ts'],
};
