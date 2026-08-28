import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { LoadingComponent } from './loading.component';

const meta: Meta<LoadingComponent> = {
  title: 'Components/Loading',
  component: LoadingComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [LoadingComponent] })],
  argTypes: {
    label: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; gap: 8px;">
        <tkf-loading [label]="label" />
        <span style="font-size: 14px; color: var(--color-foreground-muted);">{{ label }}</span>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<LoadingComponent>;

export const Default: Story = {
  args: {
    label: 'Loading…',
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Synchronizing board state…',
  },
};
