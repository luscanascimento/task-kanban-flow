/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  // Source uses NodeNext-style `.js` import specifiers; map them back to `.ts`
  // so Jest's resolver finds the TypeScript sources.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // Compile to CommonJS so dynamic `import()` inside the Fastify ecosystem
  // (e.g. @fastify/cookie loading `cookie`) becomes require() instead of
  // hitting Jest's unsupported ESM VM path.
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      { jsc: { parser: { syntax: 'typescript' } }, module: { type: 'commonjs' } },
    ],
  },
  transformIgnorePatterns: ['/node_modules/\\.pnpm/(?!(@fastify\\+|fastify@|avvio@|cookie@))'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts', '!src/**/index.ts'],
};
