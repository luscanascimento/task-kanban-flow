import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FieldComponent } from './field.component';
import { InputComponent } from '../input/input.component';

const meta: Meta<FieldComponent> = {
  title: 'Components/Field',
  component: FieldComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [FieldComponent, InputComponent] })],
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    required: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 320px;">
        <tkf-field [label]="label" [hint]="hint" [error]="error" [required]="required">
          <input tkf-input placeholder="Enter text..." [invalid]="!!error" />
        </tkf-field>
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<FieldComponent>;

export const Default: Story = {
  args: {
    label: 'Username',
    hint: 'Enter your unique public username',
    error: '',
    required: false,
  },
};

export const Required: Story = {
  args: {
    label: 'Email address',
    hint: 'We will never share your email',
    error: '',
    required: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Workspace Slug',
    hint: 'Allowed characters: a-z, 0-9 and hyphens',
    error: 'This workspace slug is already taken',
    required: true,
  },
};
