// @tkf/eslint-config/jest
// Flat config for Jest test files.
import jest from 'eslint-plugin-jest';

export default [
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/jest.setup.ts'],
    plugins: { jest },
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },
    rules: {
      ...jest.configs.recommended.rules,
      'jest/expect-expect': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
