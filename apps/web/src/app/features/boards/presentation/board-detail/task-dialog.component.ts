import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '@tkf/ui';
import type {
  AddTaskAttachmentRequestDto,
  BoardMemberDto,
  ClientDto,
  TaskAttachmentDto,
  TaskDto,
  TaskPriority,
  TaskStatus,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

const PRIORITIES: ReadonlyArray<{ value: TaskPriority; label: string }> = [
  { value: 'lowest', label: 'Lowest' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUSES: ReadonlyArray<{ value: TaskStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Modal editor for a single task. Editable fields hydrate from the task via
 * `linkedSignal` keyed on the task id — so re-opening on a different card
 * resets the form, but background updates to the same task (e.g. adding an
 * attachment) do not discard in-progress edits. Attachments are applied
 * immediately (they have their own endpoints); text fields on Save.
 */
@Component({
  selector: 'tkf-task-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent],
  template: `
    <div class="backdrop" (click)="close.emit()">
      <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <header class="dialog__header">
          <h2 class="dialog__heading" i18n>Edit task</h2>
          <button
            type="button"
            class="dialog__close"
            aria-label="Close"
            i18n-aria-label
            (click)="close.emit()"
          >
            ×
          </button>
        </header>

        <div class="dialog__body">
          <label class="field">
            <span class="field__label" i18n>Title</span>
            <input class="field__control" [(ngModel)]="title" name="title" />
          </label>

          <label class="field">
            <span class="field__label" i18n>Description</span>
            <textarea
              class="field__control"
              rows="3"
              [(ngModel)]="description"
              name="description"
            ></textarea>
          </label>

          <div class="field-row">
            <label class="field">
              <span class="field__label" i18n>Priority</span>
              <select class="field__control" [(ngModel)]="priority" name="priority">
                @for (p of priorities; track p.value) {
                  <option [value]="p.value">{{ p.label }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span class="field__label" i18n>Status</span>
              <select class="field__control" [(ngModel)]="status" name="status">
                @for (s of statuses; track s.value) {
                  <option [value]="s.value">{{ s.label }}</option>
                }
              </select>
            </label>
          </div>

          <div class="field-row">
            <label class="field">
              <span class="field__label" i18n>Assignee</span>
              <select class="field__control" [(ngModel)]="assigneeId" name="assignee">
                <option value="" i18n>Unassigned</option>
                @for (m of members(); track m.user.id) {
                  <option [value]="m.user.id">{{ m.user.displayName }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span class="field__label" i18n>Due date</span>
              <input class="field__control" type="date" [(ngModel)]="dueDate" name="dueDate" />
            </label>
          </div>

          <label class="field">
            <span class="field__label" i18n>Client</span>
            <select class="field__control" [(ngModel)]="clientId" name="client">
              <option value="" i18n>— none —</option>
              @for (c of clients(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </label>

          <!-- Attachments (prints) -->
          <div class="field">
            <span class="field__label" i18n>Attachments</span>
            @if (task().attachments.length) {
              <ul class="attachments">
                @for (att of task().attachments; track att.id) {
                  <li class="attachment">
                    @if (isImage(att)) {
                      <a [href]="att.url" target="_blank" rel="noopener noreferrer">
                        <img class="attachment__thumb" [src]="att.url" [alt]="att.name" />
                      </a>
                    } @else {
                      <span class="attachment__file">📎</span>
                    }
                    <span class="attachment__name" [title]="att.name">{{ att.name }}</span>
                    <button
                      type="button"
                      class="attachment__del"
                      aria-label="Remove attachment"
                      i18n-aria-label
                      (click)="removeAttachment.emit(att.id)"
                    >
                      ×
                    </button>
                  </li>
                }
              </ul>
            }
            <label class="upload">
              <input
                type="file"
                accept="image/*"
                (change)="onFileSelected($event)"
                hidden
                #fileInput
              />
              <button type="button" tkf-button variant="secondary" (click)="fileInput.click()" i18n>
                Upload a print
              </button>
              <span class="upload__hint" i18n>PNG, JPG or SVG</span>
            </label>
          </div>

          @if (task().checklistItems.length) {
            <div class="field">
              <span class="field__label" i18n>Checklist</span>
              <ul class="checklist">
                @for (item of task().checklistItems; track item.id) {
                  <li class="checklist__item" [class.checklist__item--done]="item.checked">
                    <span class="checklist__box">{{ item.checked ? '☑' : '☐' }}</span>
                    {{ item.text }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>

        <footer class="dialog__footer">
          <button type="button" class="dialog__delete" (click)="remove.emit(task())" i18n>
            Delete
          </button>
          <span class="dialog__spacer"></span>
          <button type="button" tkf-button variant="secondary" (click)="close.emit()" i18n>
            Cancel
          </button>
          <button type="button" tkf-button (click)="onSave()" i18n>Save changes</button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: var(--spacing-8) var(--spacing-4);
        z-index: 50;
        overflow-y: auto;
      }
      .dialog {
        width: 100%;
        max-width: 560px;
        background: var(--color-background-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        display: flex;
        flex-direction: column;
      }
      .dialog__header,
      .dialog__footer {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-4);
      }
      .dialog__header {
        border-bottom: 1px solid var(--color-neutral-200);
      }
      .dialog__footer {
        border-top: 1px solid var(--color-neutral-200);
      }
      .dialog__heading {
        margin: 0;
        font-size: var(--font-size-lg);
        flex: 1;
        color: var(--color-foreground-default);
      }
      .dialog__close {
        border: none;
        background: transparent;
        font-size: var(--font-size-xl);
        line-height: 1;
        cursor: pointer;
        color: var(--color-foreground-muted);
      }
      .dialog__body {
        padding: var(--spacing-4);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
        flex: 1;
      }
      .field-row {
        display: flex;
        gap: var(--spacing-4);
      }
      .field__label {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .field__control {
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .field__control:focus {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 0;
        border-color: transparent;
      }
      .attachments {
        list-style: none;
        margin: 0 0 var(--spacing-2);
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }
      .attachment {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
      .attachment__thumb {
        width: 44px;
        height: 44px;
        object-fit: cover;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-neutral-200);
        display: block;
      }
      .attachment__file {
        font-size: var(--font-size-lg);
      }
      .attachment__name {
        flex: 1;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-default);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .attachment__del {
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        cursor: pointer;
        font-size: var(--font-size-lg);
        line-height: 1;
      }
      .attachment__del:hover {
        color: var(--color-semantic-danger);
      }
      .upload {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
      .upload__hint {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
      }
      .checklist {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }
      .checklist__item {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-default);
        display: flex;
        gap: var(--spacing-2);
      }
      .checklist__item--done {
        color: var(--color-foreground-subtle);
        text-decoration: line-through;
      }
      .dialog__spacer {
        flex: 1;
      }
      .dialog__delete {
        border: none;
        background: transparent;
        color: var(--color-semantic-danger);
        cursor: pointer;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }
    `,
  ],
})
export class TaskDialogComponent {
  readonly task = input.required<TaskDto>();
  readonly members = input<ReadonlyArray<BoardMemberDto>>([]);
  readonly clients = input<ReadonlyArray<ClientDto>>([]);

  readonly save = output<UpdateTaskRequestDto>();
  readonly close = output<void>();
  readonly remove = output<TaskDto>();
  readonly addAttachment = output<AddTaskAttachmentRequestDto>();
  readonly removeAttachment = output<string>();

  readonly priorities = PRIORITIES;
  readonly statuses = STATUSES;

  // Keyed on task id: reset only when a different task is opened, so applying
  // an attachment (which mutates the same task) keeps unsaved text edits.
  private readonly taskId = () => this.task().id;
  readonly title = linkedSignal({ source: this.taskId, computation: () => this.task().title });
  readonly description = linkedSignal({
    source: this.taskId,
    computation: () => this.task().description ?? '',
  });
  readonly priority = linkedSignal<string, TaskPriority>({
    source: this.taskId,
    computation: () => this.task().priority,
  });
  readonly status = linkedSignal<string, TaskStatus>({
    source: this.taskId,
    computation: () => this.task().status,
  });
  readonly assigneeId = linkedSignal({
    source: this.taskId,
    computation: () => this.task().assigneeId ?? '',
  });
  readonly clientId = linkedSignal({
    source: this.taskId,
    computation: () => this.task().clientId ?? '',
  });
  readonly dueDate = linkedSignal({
    source: this.taskId,
    computation: () => this.task().dueDate?.slice(0, 10) ?? '',
  });

  isImage(att: TaskAttachmentDto): boolean {
    return att.mimeType.startsWith('image/');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.addAttachment.emit({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        url: reader.result as string,
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  onSave(): void {
    const dueDate = this.dueDate();
    const assigneeId = this.assigneeId();
    const clientId = this.clientId();
    this.save.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      priority: this.priority(),
      status: this.status(),
      assigneeId: assigneeId === '' ? null : assigneeId,
      clientId: clientId === '' ? null : clientId,
      dueDate: dueDate === '' ? null : new Date(dueDate).toISOString(),
    });
  }
}
