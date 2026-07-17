import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, type CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';

import { ButtonComponent } from '@tkf/ui';
import type { TaskDto } from '@tkf/shared-types';

import { type ColumnWithTasks } from '../board-detail-store';
import { TaskCardComponent } from './task-card.component';

/**
 * A single kanban column: a CDK drop list of task cards with a colored
 * header, WIP-limit indicator, and an inline "add card" affordance. It is
 * presentational — every mutation is emitted upward to the board, which
 * routes it through the facade.
 */
@Component({
  selector: 'tkf-column',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle, TaskCardComponent, ButtonComponent],
  host: { '[class.column--over-wip]': 'data().isOverWipLimit' },
  template: `
    <div class="column">
      <header class="column__header">
        <span
          class="column__grip"
          cdkDragHandle
          aria-label="Drag to reorder column"
          i18n-aria-label
          title="Drag to reorder"
          >⋮⋮</span
        >
        <span
          class="column__dot"
          [style.background]="data().column.color || 'var(--color-neutral-400)'"
        ></span>
        <h3 class="column__title">{{ data().column.title }}</h3>
        <span class="column__count" [class.column__count--over]="data().isOverWipLimit">
          {{ data().tasks.length }}
          @if (wipLimit()) {
            <span> / {{ wipLimit() }}</span>
          }
        </span>
        <button
          type="button"
          class="column__menu"
          aria-label="Delete column"
          i18n-aria-label
          (click)="deleteColumn.emit(data().column.id)"
        >
          🗑
        </button>
      </header>

      <div
        class="column__list"
        cdkDropList
        [id]="data().column.id"
        [cdkDropListData]="data().tasks"
        [cdkDropListConnectedTo]="connectedTo()"
        [cdkDropListEnterPredicate]="dropPredicate()"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        @for (task of data().tasks; track task.id) {
          <div class="column__item" cdkDrag [cdkDragData]="task">
            <div class="column__placeholder" *cdkDragPlaceholder></div>
            <tkf-task-card
              [task]="task"
              (edit)="editTask.emit($event)"
              (delete)="deleteTask.emit($event)"
            />
          </div>
        } @empty {
          <p class="column__empty" i18n>Drop tasks here</p>
        }
      </div>

      @if (adding()) {
        <form class="column__add" (submit)="submit($event)">
          <input
            #titleInput
            class="column__add-input"
            [(ngModel)]="draftTitle"
            name="title"
            placeholder="Task title…"
            i18n-placeholder
            autocomplete="off"
            (keydown.escape)="cancel()"
          />
          <div class="column__add-actions">
            <button type="submit" tkf-button [disabled]="!draftTitle().trim()" i18n>Add</button>
            <button type="button" class="column__add-cancel" (click)="cancel()" i18n>Cancel</button>
          </div>
        </form>
      } @else {
        <button type="button" class="column__add-trigger" (click)="startAdding()" i18n>
          + Add card
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 300px;
        flex: 0 0 auto;
      }
      .column {
        display: flex;
        flex-direction: column;
        max-height: 100%;
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-2);
      }
      :host(.column--over-wip) .column {
        border-color: var(--color-semantic-danger);
      }
      .column__header {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-2);
      }
      .column__grip {
        cursor: grab;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-sm);
        line-height: 1;
        letter-spacing: -2px;
        user-select: none;
        padding-right: 2px;
      }
      .column__grip:active {
        cursor: grabbing;
      }
      .column__dot {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
      }
      .cdk-drag-preview .column {
        box-shadow: var(--shadow-xl);
      }
      .column__title {
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-foreground-default);
        flex: 1;
      }
      .column__count {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-foreground-muted);
        background: var(--color-neutral-100);
        border-radius: var(--radius-full);
        padding: 1px var(--spacing-2);
      }
      .column__count--over {
        color: var(--color-neutral-0);
        background: var(--color-semantic-danger);
      }
      .column__menu {
        border: none;
        background: transparent;
        cursor: pointer;
        opacity: 0.5;
        font-size: var(--font-size-sm);
        transition: opacity 120ms ease;
      }
      .column__menu:hover {
        opacity: 1;
      }
      .column__list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        padding: var(--spacing-1);
        overflow-y: auto;
        min-height: 40px;
      }
      .column__item {
        border-radius: var(--radius-md);
      }
      .cdk-drag-preview {
        box-shadow: var(--shadow-xl);
        border-radius: var(--radius-md);
      }
      .cdk-drag-animating {
        transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
      }
      .column__list.cdk-drop-list-dragging .column__item:not(.cdk-drag-placeholder) {
        transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
      }
      .column__placeholder {
        min-height: 52px;
        border: 2px dashed var(--color-brand-500);
        border-radius: var(--radius-md);
        background: var(--color-brand-50);
      }
      .column__empty {
        text-align: center;
        color: var(--color-foreground-subtle);
        font-size: var(--font-size-xs);
        padding: var(--spacing-4) 0;
        margin: 0;
      }
      .column__add-trigger,
      .column__add-cancel {
        border: none;
        background: transparent;
        color: var(--color-foreground-muted);
        cursor: pointer;
        text-align: left;
        padding: var(--spacing-2);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
      }
      .column__add-trigger:hover {
        background: var(--color-neutral-100);
        color: var(--color-foreground-default);
      }
      .column__add {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        padding: var(--spacing-2);
      }
      .column__add-input {
        width: 100%;
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .column__add-input:focus {
        outline: 2px solid var(--color-brand-500);
        outline-offset: 0;
        border-color: transparent;
      }
      .column__add-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
    `,
  ],
})
export class ColumnComponent {
  readonly data = input.required<ColumnWithTasks>();
  /** Predicate deciding whether a dragged item may enter this task list
   * (used to keep column drags out of the card lists). */
  readonly dropPredicate = input<(drag: CdkDrag) => boolean>(() => true);
  /** Ids of the sibling task lists cards may be dropped into (all columns). */
  readonly connectedTo = input<ReadonlyArray<string>>([]);

  readonly addTask = output<string>();
  readonly editTask = output<TaskDto>();
  readonly deleteTask = output<TaskDto>();
  readonly deleteColumn = output<string>();
  readonly dropped = output<CdkDragDrop<ReadonlyArray<TaskDto>>>();

  readonly adding = signal(false);
  readonly draftTitle = signal('');

  readonly wipLimit = computed(() => this.data().column.wipLimit);

  startAdding(): void {
    this.adding.set(true);
  }

  cancel(): void {
    this.adding.set(false);
    this.draftTitle.set('');
  }

  submit(event: Event): void {
    event.preventDefault();
    const title = this.draftTitle().trim();
    if (!title) return;
    this.addTask.emit(title);
    this.draftTitle.set('');
    // keep the composer open so users can add several cards in a row
  }
}
