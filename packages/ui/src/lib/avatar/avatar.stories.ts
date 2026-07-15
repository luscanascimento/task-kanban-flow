import type { Meta, StoryObj } from '@storybook/angular';

import { AvatarComponent } from './avatar.component';

const meta: Meta<AvatarComponent> = {
  title: 'Components/Avatar',
  component: AvatarComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    name: { control: 'text' },
    src: { control: 'text' },
  },
};
export default meta;

type Story = StoryObj<AvatarComponent>;

export const Initials: Story = { args: { name: 'Ana Souza', size: 'md' } };

export const WithImage: Story = {
  args: { name: 'Ana Souza', src: 'https://i.pravatar.cc/80?img=5', size: 'md' },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:12px; align-items:center">
        <tkf-avatar name="Ana Souza" size="sm" />
        <tkf-avatar name="Bruno Lima" size="md" />
        <tkf-avatar name="Carla Dias" size="lg" />
      </div>
    `,
  }),
};

export const DeterministicColours: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:8px">
        <tkf-avatar name="Ana Souza" />
        <tkf-avatar name="Bruno Lima" />
        <tkf-avatar name="Carla Dias" />
        <tkf-avatar name="Diego Reis" />
        <tkf-avatar name="Eva Nunes" />
      </div>
    `,
  }),
};
