import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from './modal.component';

const meta: Meta<ModalComponent> = {
  title: 'Components/Modal',
  component: ModalComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ModalComponent, ButtonComponent] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<ModalComponent>;

/** A modal is shown while it is in the DOM; toggle it with the trigger button. */
export const Titled: Story = {
  render: () => ({
    props: { open: false },
    template: `
      <div style="padding:24px">
        <button tkf-button (click)="open = true">Open modal</button>
        @if (open) {
          <tkf-modal title="Edit task" size="md" (close)="open = false">
            <p style="margin-top:0">Focus is trapped here; press Escape or click the backdrop to close.</p>
            <div style="display:flex; gap:8px; justify-content:flex-end">
              <button tkf-button variant="secondary" (click)="open = false">Cancel</button>
              <button tkf-button (click)="open = false">Save</button>
            </div>
          </tkf-modal>
        }
      </div>
    `,
  }),
};
