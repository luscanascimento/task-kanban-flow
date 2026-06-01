// @tkf/eslint-config/storybook
// Flat config for Storybook stories.
import storybook from 'eslint-plugin-storybook';

export default [
  {
    files: ['**/*.stories.ts', '**/*.stories.mdx'],
    plugins: { storybook },
    rules: {
      ...storybook.configs.recommended.rules,
      'storybook/no-uninstalled-addons': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];
