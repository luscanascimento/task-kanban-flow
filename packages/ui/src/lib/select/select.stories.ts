import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { SelectComponent } from './select.component';

const meta: Meta<SelectComponent> = {
  title: 'Components/Select',
  component: SelectComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [SelectComponent] })],
  argTypes: {
    invalid: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 320px;">
        <select tkf-select [invalid]="invalid">
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<SelectComponent>;

export const Default: Story = {
  args: {
    invalid: false,
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
  },
};
