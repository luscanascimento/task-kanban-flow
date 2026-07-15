import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { SkeletonComponent } from './skeleton.component';

const meta: Meta<SkeletonComponent> = {
  title: 'Components/Skeleton',
  component: SkeletonComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [SkeletonComponent] })],
};
export default meta;

type Story = StoryObj<SkeletonComponent>;

export const Line: Story = {
  render: () => ({ template: `<tkf-skeleton width="200px" height="1rem" />` }),
};

export const CardPlaceholder: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:8px; width:280px;
                  padding:16px; border:1px solid var(--color-neutral-200); border-radius:12px">
        <div style="display:flex; gap:8px; align-items:center">
          <tkf-skeleton width="32px" height="32px" radius="full" />
          <tkf-skeleton width="120px" height="0.9rem" />
        </div>
        <tkf-skeleton width="100%" height="0.8rem" />
        <tkf-skeleton width="80%" height="0.8rem" />
      </div>
    `,
  }),
};
