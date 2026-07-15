import type { Preview } from '@storybook/angular';

// Design tokens (light + dark CSS variables) are loaded via the builder's
// `styles` option in angular.json so components theme correctly.

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: 'var(--color-background-default, #fff)' },
        { name: 'subtle', value: 'var(--color-background-subtle, #f5f5f5)' },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Design-token theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      document.documentElement.setAttribute('data-theme', context.globals['theme'] as string);
      return story();
    },
  ],
};

export default preview;
