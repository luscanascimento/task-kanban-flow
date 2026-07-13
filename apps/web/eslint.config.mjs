import angular from '@tkf/eslint-config/angular';

export default [
  {
    ignores: ['src/mocks/**'],
  },
  ...angular,
  {
    // Test specs live outside tsconfig.app.json; point the type-aware rules at
    // the spec tsconfig so `eslint src` can parse them.
    files: ['**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.spec.json',
      },
    },
  },
];
