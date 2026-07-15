import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { InputComponent } from './input.component';

const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [InputComponent] })],
};
export default meta;

type Story = StoryObj<InputComponent>;

export const Outlined: Story = {
  render: () => ({
    template: `<input tkf-input label="Email" placeholder="you@example.com" style="max-width:320px" />`,
  }),
};

export const Filled: Story = {
  render: () => ({
    template: `<input tkf-input variant="filled" label="Search" placeholder="Search…" style="max-width:320px" />`,
  }),
};

export const Invalid: Story = {
  render: () => ({
    template: `<input tkf-input label="Email" [invalid]="true" value="not-an-email" style="max-width:320px" />`,
  }),
};
