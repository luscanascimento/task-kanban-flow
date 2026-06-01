/** Shared Jest preset for non-Angular packages in the monorepo. */
module.exports = {
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' } } }],
  },
  moduleFileExtensions: ['js', 'ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/*.d.ts', '!**/index.ts'],
  coverageReporters: ['text', 'lcov'],
};
