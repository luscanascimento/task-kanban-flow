import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ButtonComponent,
  InputComponent,
  ModalComponent,
  SelectComponent,
  TextareaComponent,
  ToastService,
} from '@tkf/ui';
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

/** 5 MB — data-URL attachments live in memory, so keep uploads modest. */
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Accepted MIME prefixes/exact types for task attachments. */
const ACCEPTED_MIME_PREFIXES = ['image/', 'text/'];
const ACCEPTED_MIME_EXACT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Modal editor for a single task, built on the accessible `tkf-modal`
 * (focus trap, Escape, focus restore, scroll lock). Editable fields hydrate
 * from the task via `linkedSignal` keyed on the task id — so re-opening on a
 * different card resets the form, but background updates to the same task
 * (e.g. adding an attachment) do not discard in-progress edits. Attachments
 * are applied immediately; text fields on Save.
 */
@Component({
  selector: 'tkf-task-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ModalComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  template: `
    <tkf-modal title="Edit task" size="lg" (close)="close.emit()">
      <div class="form">
        <label class="field">
          <span class="field__label" i18n>Title</span>
          <input tkf-input [(ngModel)]="title" name="title" />
        </label>

        <label class="field">
          <span class="field__label" i18n>Description</span>
          <textarea tkf-textarea rows="3" [(ngModel)]="description" name="description"></textarea>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field__label" i18n>Priority</span>
            <select tkf-select [(ngModel)]="priority" name="priority">
              @for (p of priorities; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label" i18n>Status</span>
            <select tkf-select [(ngModel)]="status" name="status">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </label>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field__label" i18n>Assignee</span>
            <select tkf-select [(ngModel)]="assigneeId" name="assignee">
              <option value="" i18n>Unassigned</option>
              @for (m of members(); track m.user.id) {
                <option [value]="m.user.id">{{ m.user.displayName }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="field__label" i18n>Due date</span>
            <input tkf-input type="date" [(ngModel)]="dueDate" name="dueDate" />
          </label>
        </div>

        <label class="field">
          <span class="field__label" i18n>Client</span>
          <select tkf-select [(ngModel)]="clientId" name="client">
            <option value="" i18n>— none —</option>
            @for (c of clients(); track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select>
        </label>

        <!-- Attachments -->
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
                    <span class="attachment__file" aria-hidden="true">📎</span>
                  }
                  <span class="attachment__name" [title]="att.name">{{ att.name }}</span>
                  <span class="attachment__size">{{ size(att) }}</span>
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
              accept="image/*,application/pdf,.doc,.docx,.txt,.csv"
              (change)="onFileSelected($event)"
              hidden
              #fileInput
            />
            <button type="button" tkf-button variant="secondary" (click)="fileInput.click()" i18n>
              Upload file
            </button>
            <span class="upload__hint" i18n>Images, PDF or docs · max 5 MB</span>
          </label>
        </div>

        @if (task().checklistItems.length) {
          <div class="field">
            <span class="field__label" i18n>Checklist</span>
            <ul class="checklist">
              @for (item of task().checklistItems; track item.id) {
                <li class="checklist__item" [class.checklist__item--done]="item.checked">
                  <span class="checklist__box" aria-hidden="true">{{
                    item.checked ? '☑' : '☐'
                  }}</span>
                  {{ item.text }}
                </li>
              }
            </ul>
          </div>
        }

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
    </tkf-modal>
  `,
  styles: [
    `
      .form {
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
      .attachment__size {
        font-size: var(--font-size-xs);
        color: var(--color-foreground-subtle);
        flex-shrink: 0;
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
      .attachment__del:focus-visible {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 2px;
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
      .dialog__footer {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding-top: var(--spacing-2);
        border-top: 1px solid var(--color-neutral-200);
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
      .dialog__delete:focus-visible {
        outline: 2px solid var(--color-semantic-danger);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
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

  private readonly toast = inject(ToastService);

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

  size(att: TaskAttachmentDto): string {
    return formatBytes(att.sizeBytes);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      this.toast.error(`"${file.name}" is ${formatBytes(file.size)} — the limit is 5 MB.`);
      return;
    }
    const mime = file.type || 'application/octet-stream';
    const accepted =
      ACCEPTED_MIME_PREFIXES.some((p) => mime.startsWith(p)) || ACCEPTED_MIME_EXACT.includes(mime);
    if (!accepted) {
      this.toast.error(`"${file.name}" (${mime}) is not an accepted file type.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.addAttachment.emit({
        name: file.name,
        mimeType: mime,
        url: reader.result as string,
        sizeBytes: file.size,
      });
    };
    reader.onerror = () => this.toast.error(`Failed to read "${file.name}".`);
    reader.readAsDataURL(file);
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
