import { Component, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { ButtonComponent } from '../button/button.component';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from './toast.service';

/** Small host that drives the ToastService for the story. */
@Component({
  selector: 'tkf-toast-demo',
  standalone: true,
  imports: [ButtonComponent, ToastContainerComponent],
  template: `
    <div style="display:flex; gap:8px; flex-wrap:wrap; padding:24px">
      <button tkf-button variant="secondary" (click)="toasts.success('Board saved')">
        Success
      </button>
      <button tkf-button variant="secondary" (click)="toasts.error('Failed to save board')">
        Error
      </button>
      <button tkf-button variant="secondary" (click)="toasts.warning('WIP limit reached')">
        Warning
      </button>
      <button tkf-button variant="secondary" (click)="toasts.info('Refreshing…')">Info</button>
    </div>
    <tkf-toast-container />
  `,
})
class ToastDemoComponent {
  protected readonly toasts = inject(ToastService);
}

const meta: Meta<ToastDemoComponent> = {
  title: 'Components/Toast',
  component: ToastDemoComponent,
  decorators: [moduleMetadata({ imports: [ToastDemoComponent] })],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<ToastDemoComponent>;

export const Playground: Story = {};
