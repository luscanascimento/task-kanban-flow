import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ButtonComponent] })],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    disabled: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<button tkf-button [variant]="variant" [disabled]="disabled">Save changes</button>`,
  }),
};
export default meta;

type Story = StoryObj<ButtonComponent>;

export const Primary: Story = { args: { variant: 'primary', disabled: false } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center">
        <button tkf-button variant="primary">Primary</button>
        <button tkf-button variant="secondary">Secondary</button>
        <button tkf-button variant="ghost">Ghost</button>
        <button tkf-button variant="danger">Danger</button>
        <button tkf-button variant="primary" [disabled]="true">Disabled</button>
      </div>
    `,
  }),
};
