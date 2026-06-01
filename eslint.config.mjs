// Root ESLint flat config.
// Aggregates package-level configs and applies ignores shared across the monorepo.
import base from '@tkf/eslint-config/base';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.angular/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/storybook-static/**',
      '**/.storybook-static/**',
      '**/node_modules/**',
      'packages/design-tokens/dist/**',
      'apps/*/public/mockServiceWorker.js',
      '**/*.tsbuildinfo',
    ],
  },
  ...base,
];
