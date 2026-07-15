import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { AvatarComponent, BadgeComponent, type BadgeVariant } from '@tkf/ui';
import type { TaskDto, TaskPriority } from '@tkf/shared-types';

const PRIORITY_META: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  urgent: { label: 'Urgent', variant: 'danger' },
  high: { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'info' },
  low: { label: 'Low', variant: 'neutral' },
  lowest: { label: 'Lowest', variant: 'neutral' },
};

/**
 * Presentational kanban card. Renders a task's title, priority, labels,
 * assignee, due date and progress indicators. Emits intents (edit/delete)
 * for the parent to orchestrate — it holds no state and talks to no facade.
 */
@Component({
  selector: 'tkf-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, BadgeComponent],
  host: { '[attr.data-priority]': 'task().priority' },
  template: `
    <article
      class="card"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Edit task: ' + task().title"
      (click)="edit.emit(task())"
      (keydown.enter)="activate($event)"
      (keydown.space)="activate($event)"
    >
      <header class="card__top">
        <tkf-badge [variant]="priorityVariant()" size="sm">{{ priorityLabel() }}</tkf-badge>
        <button
          type="button"
          class="card__delete"
          aria-label="Delete task"
          i18n-aria-label
          (click)="onDelete($event)"
        >
          ×
        </button>
      </header>

      <p class="card__title">{{ task().title }}</p>

      @if (task().labels.length) {
        <ul class="card__labels">
          @for (label of task().labels; track label.id) {
            <li class="card__label" [style.--label-color]="label.color">{{ label.name }}</li>
          }
        </ul>
      }

      @if (imageAttachments().length) {
        <div class="card__thumbs">
          @for (att of imageAttachments(); track att.id) {
            <img class="card__thumb" [src]="att.url" [alt]="att.name" loading="lazy" />
          }
        </div>
      }

      <footer class="card__meta">
        <div class="card__badges">
          @if (checklistTotal() > 0) {
            <span
              class="badge"
              [class.badge--done]="checklistDone() === checklistTotal()"
              title="Checklist"
            >
              ☑ {{ checklistDone() }}/{{ checklistTotal() }}
            </span>
          }
          @if (task().commentCount > 0) {
            <span class="badge" title="Comments">💬 {{ task().commentCount }}</span>
          }
          @if (task().attachmentCount > 0) {
            <span class="badge" title="Attachments">📎 {{ task().attachmentCount }}</span>
          }
          @if (task().dueDate) {
            <span class="badge badge--due" [class.badge--overdue]="isOverdue()">
              📅 {{ dueLabel() }}
            </span>
          }
        </div>
        @if (task().assignee; as assignee) {
          <tkf-avatar [name]="assignee.displayName" size="sm" />
        }
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .card {
        background: var(--color-background-default);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-md);
        padding: var(--spacing-3);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        transition:
          box-shadow 120ms ease,
          border-color 120ms ease,
          transform 120ms ease;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }
      .card:hover {
        border-color: var(--color-brand-500);
        box-shadow: var(--shadow-md);
      }
      .card:focus-visible {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 2px;
      }
      .card__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-2);
      }
      .card__delete {
        border: none;
        background: transparent;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-lg);
        line-height: 1;
        cursor: pointer;
        border-radius: var(--radius-sm);
        width: 22px;
        height: 22px;
        opacity: 0;
        transition:
          opacity 120ms ease,
          background 120ms ease,
          color 120ms ease;
      }
      .card:hover .card__delete,
      .card:focus-within .card__delete,
      .card__delete:focus-visible {
        opacity: 1;
      }
      .card__delete:hover {
        background: var(--color-semantic-danger);
        color: var(--color-neutral-0);
      }
      .card__title {
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-foreground-default);
        line-height: var(--font-lineHeight-normal);
      }
      .card__labels {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-1);
      }
      .card__label {
        font-size: 11px;
        font-weight: var(--font-weight-medium);
        padding: 1px var(--spacing-2);
        border-radius: var(--radius-sm);
        color: var(--label-color, var(--color-foreground-muted));
        background: color-mix(
          in srgb,
          var(--label-color, var(--color-neutral-400)) 14%,
          transparent
        );
      }
      .card__thumbs {
        display: flex;
        gap: var(--spacing-1);
        flex-wrap: wrap;
      }
      .card__thumb {
        width: 100%;
        max-height: 120px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-neutral-200);
        display: block;
      }
      .card__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-2);
      }
      .card__badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-2);
      }
      .badge {
        font-size: 11px;
        color: var(--color-foreground-muted);
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .badge--done {
        color: var(--color-semantic-success);
      }
      .badge--overdue {
        color: var(--color-semantic-danger);
        font-weight: var(--font-weight-semibold);
      }
    `,
  ],
})
export class TaskCardComponent {
  readonly task = input.required<TaskDto>();
  readonly edit = output<TaskDto>();
  readonly delete = output<TaskDto>();

  readonly priorityLabel = computed(() => PRIORITY_META[this.task().priority].label);
  readonly priorityVariant = computed(() => PRIORITY_META[this.task().priority].variant);
  readonly checklistTotal = computed(() => this.task().checklistItems.length);
  readonly checklistDone = computed(
    () => this.task().checklistItems.filter((i) => i.checked).length,
  );
  /** Up to two image attachments shown as inline previews (the "prints"). */
  readonly imageAttachments = computed(() =>
    this.task()
      .attachments.filter((a) => a.mimeType.startsWith('image/'))
      .slice(0, 2),
  );

  readonly isOverdue = computed(() => {
    const due = this.task().dueDate;
    return !!due && this.task().status !== 'done' && new Date(due).getTime() < Date.now();
  });

  readonly dueLabel = computed(() => {
    const due = this.task().dueDate;
    if (!due) return '';
    return new Date(due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });

  onDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.task());
  }

  /** Keyboard activation (Enter/Space) opens the task, mirroring a click. */
  activate(event: Event): void {
    event.preventDefault();
    this.edit.emit(this.task());
  }
}
