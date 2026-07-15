import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { CardComponent } from './card.component';

const meta: Meta<CardComponent> = {
  title: 'Components/Card',
  component: CardComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [CardComponent] })],
  argTypes: {
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
    interactive: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <tkf-card [padding]="padding" [interactive]="interactive" style="max-width:280px">
        <h3 style="margin:0 0 8px">Card title</h3>
        <p style="margin:0; color:var(--color-foreground-muted)">
          A surface container with token-driven border, radius and elevation.
        </p>
      </tkf-card>
    `,
  }),
};
export default meta;

type Story = StoryObj<CardComponent>;

export const Default: Story = { args: { padding: 'md', interactive: false } };
export const Interactive: Story = { args: { padding: 'md', interactive: true } };
