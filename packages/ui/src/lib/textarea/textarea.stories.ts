import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { TextareaComponent } from './textarea.component';

const meta: Meta<TextareaComponent> = {
  title: 'Components/Textarea',
  component: TextareaComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [TextareaComponent] })],
  argTypes: {
    invalid: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 360px;">
        <textarea tkf-textarea [invalid]="invalid" placeholder="Write task description or Markdown..." rows="4"></textarea>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<TextareaComponent>;

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
