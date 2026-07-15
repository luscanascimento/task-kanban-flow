import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { BadgeComponent } from './badge.component';

const meta: Meta<BadgeComponent> = {
  title: 'Components/Badge',
  component: BadgeComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [BadgeComponent] })],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'brand', 'success', 'warning', 'danger', 'info'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
  render: (args) => ({
    props: args,
    template: `<tkf-badge [variant]="variant" [size]="size">Label</tkf-badge>`,
  }),
};
export default meta;

type Story = StoryObj<BadgeComponent>;

export const Neutral: Story = { args: { variant: 'neutral', size: 'sm' } };
export const Brand: Story = { args: { variant: 'brand' } };

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <tkf-badge variant="neutral">Neutral</tkf-badge>
        <tkf-badge variant="brand">Brand</tkf-badge>
        <tkf-badge variant="success">Success</tkf-badge>
        <tkf-badge variant="warning">Warning</tkf-badge>
        <tkf-badge variant="danger">Danger</tkf-badge>
        <tkf-badge variant="info">Info</tkf-badge>
      </div>
    `,
  }),
};
