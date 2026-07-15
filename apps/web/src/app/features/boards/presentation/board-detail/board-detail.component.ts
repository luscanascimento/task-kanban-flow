import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CdkDrag,
  type CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

import {
  AvatarComponent,
  ButtonComponent,
  InputComponent,
  LoadingComponent,
  SelectComponent,
} from '@tkf/ui';
import type {
  AddTaskAttachmentRequestDto,
  ColumnDto,
  TaskDto,
  TaskPriority,
  UpdateTaskRequestDto,
} from '@tkf/shared-types';

const PRIORITIES: ReadonlyArray<TaskPriority> = ['urgent', 'high', 'medium', 'low', 'lowest'];

import { BoardDetailFacade } from '../../application/board-detail.facade';
import { ColumnComponent } from './column.component';
import { SecretsPanelComponent } from './secrets-panel.component';
import { TaskDialogComponent } from './task-dialog.component';

type BoardTab = 'board' | 'secrets';

/**
 * Board detail — the kanban board. Loads its data from the route's
 * `boardId` (component input binding), renders columns inside a single
 * `cdkDropListGroup` so cards can be dragged between them, and opens the
 * task dialog on card click. All mutations route through the facade.
 */
@Component({
  selector: 'tkf-board-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    ColumnComponent,
    TaskDialogComponent,
    SecretsPanelComponent,
    AvatarComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    LoadingComponent,
  ],
  template: `
    <div class="board">
      <header class="board__header">
        <div class="board__heading">
          <a routerLink="/boards" class="board__back" i18n>← Boards</a>
          @if (facade.board(); as board) {
            <h1 class="board__title">{{ board.title }}</h1>
            @if (board.description) {
              <p class="board__desc">{{ board.description }}</p>
            }
          }
        </div>
        <div class="board__aside">
          @if (facade.board(); as board) {
            <label class="board__client">
              <span i18n>Client</span>
              <select
                [ngModel]="board.clientId ?? ''"
                (ngModelChange)="setClient($event)"
                aria-label="Board client"
                i18n-aria-label
              >
                <option value="" i18n>— none —</option>
                @for (c of facade.clients(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </label>
            <div class="board__members" [attr.aria-label]="'Members'" i18n-aria-label>
              @for (member of board.members; track member.user.id) {
                <tkf-avatar
                  class="board__avatar"
                  [name]="member.user.displayName"
                  size="sm"
                  [title]="member.user.displayName"
                />
              }
            </div>
            <span class="board__count"
              >{{ facade.taskCount() }} <ng-container i18n>tasks</ng-container></span
            >
          }
        </div>
      </header>

      <nav class="tabs">
        <button
          type="button"
          class="tabs__btn"
          [class.tabs__btn--active]="tab() === 'board'"
          (click)="tab.set('board')"
          i18n
        >
          Board
        </button>
        <button
          type="button"
          class="tabs__btn"
          [class.tabs__btn--active]="tab() === 'secrets'"
          (click)="tab.set('secrets')"
        >
          🔒 <ng-container i18n>Secrets</ng-container>
        </button>
      </nav>

      @if (facade.error(); as error) {
        <p class="board__error" role="alert">{{ error }}</p>
      }

      @if (facade.isLoading()) {
        <div class="board__loading"><tkf-loading /> <span i18n>Loading board…</span></div>
      } @else if (tab() === 'secrets') {
        <div class="board__scroll">
          <tkf-secrets-panel [boardId]="boardId()" [clients]="facade.clients()" />
        </div>
      } @else {
        <div class="board__filters">
          <input
            tkf-input
            class="board__search"
            type="search"
            [ngModel]="facade.searchQuery()"
            (ngModelChange)="facade.setSearchQuery($event)"
            placeholder="Search cards…"
            i18n-placeholder
            aria-label="Search cards"
            i18n-aria-label
          />
          <select
            tkf-select
            class="board__priority-filter"
            [ngModel]="facade.priorityFilter() ?? ''"
            (ngModelChange)="onPriorityFilter($event)"
            aria-label="Filter by priority"
            i18n-aria-label
          >
            <option value="" i18n>All priorities</option>
            @for (p of priorities; track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
          @if (facade.hasActiveFilters()) {
            <span class="board__filter-count"
              >{{ facade.filteredTaskCount() }} <ng-container i18n>of</ng-container>
              {{ facade.taskCount() }}</span
            >
            <button type="button" class="board__filter-clear" (click)="facade.clearFilters()" i18n>
              Clear
            </button>
          }
        </div>
        <div
          class="board__columns"
          cdkDropListGroup
          cdkDropList
          cdkDropListOrientation="horizontal"
          [cdkDropListData]="facade.orderedColumns()"
          [cdkDropListEnterPredicate]="acceptColumns"
          (cdkDropListDropped)="onColumnDrop($event)"
        >
          @for (group of facade.filteredColumnsWithTasks(); track group.column.id) {
            <div class="board__column-wrap" cdkDrag [cdkDragData]="group.column">
              <tkf-column
                [data]="group"
                [dropPredicate]="acceptTasks"
                (addTask)="onAddTask(group.column.id, $event)"
                (editTask)="openTask($event)"
                (deleteTask)="onDeleteTask($event)"
                (deleteColumn)="onDeleteColumn($event)"
                (dropped)="onDrop($event)"
              />
            </div>
          }

          <div class="board__add-column">
            @if (addingColumn()) {
              <form class="add-column" (submit)="submitColumn($event)">
                <input
                  class="add-column__input"
                  [(ngModel)]="columnTitle"
                  name="columnTitle"
                  placeholder="Column title…"
                  i18n-placeholder
                  autocomplete="off"
                  (keydown.escape)="addingColumn.set(false)"
                />
                <button type="submit" tkf-button [disabled]="!columnTitle().trim()" i18n>
                  Add column
                </button>
              </form>
            } @else {
              <button
                type="button"
                class="board__add-column-trigger"
                (click)="addingColumn.set(true)"
                i18n
              >
                + Add column
              </button>
            }
          </div>
        </div>
      }
    </div>

    @if (selectedTask(); as task) {
      <tkf-task-dialog
        [task]="task"
        [members]="facade.board()?.members ?? []"
        [clients]="facade.clients()"
        (save)="onSaveTask(task.id, $event)"
        (addAttachment)="onAddAttachment(task.id, $event)"
        (removeAttachment)="onRemoveAttachment(task.id, $event)"
        (remove)="onDeleteTask($event); closeDialog()"
        (close)="closeDialog()"
      />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: calc(100vh - 56px);
        display: flex;
        flex-direction: column;
      }
      .board {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: var(--spacing-3);
      }
      .board__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-4);
        flex-wrap: wrap;
      }
      .board__back {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .board__title {
        margin: var(--spacing-1) 0 0;
        font-size: var(--font-size-2xl);
        color: var(--color-foreground-default);
      }
      .board__desc {
        margin: var(--spacing-1) 0 0;
        color: var(--color-foreground-muted);
        font-size: var(--font-size-sm);
        max-width: 60ch;
      }
      .board__aside {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
      }
      .board__client {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-1);
        font-size: var(--font-size-xs);
        color: var(--color-foreground-muted);
      }
      .board__client select {
        padding: var(--spacing-1) var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
        background: var(--color-background-default);
        color: var(--color-foreground-default);
      }
      .tabs {
        display: flex;
        gap: var(--spacing-1);
        border-bottom: 1px solid var(--color-neutral-200);
      }
      .tabs__btn {
        border: none;
        background: transparent;
        padding: var(--spacing-2) var(--spacing-3);
        cursor: pointer;
        font: inherit;
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .tabs__btn--active {
        color: var(--color-brand-600);
        border-bottom-color: var(--color-brand-500);
        font-weight: var(--font-weight-semibold);
      }
      .board__scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding-top: var(--spacing-3);
      }
      .board__members {
        display: flex;
      }
      .board__avatar {
        margin-left: -8px;
      }
      .board__avatar:first-child {
        margin-left: 0;
      }
      .board__count {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .board__error {
        color: var(--color-semantic-danger);
        background: color-mix(in srgb, var(--color-semantic-danger) 10%, transparent);
        padding: var(--spacing-2) var(--spacing-3);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        margin: 0;
      }
      .board__loading {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        color: var(--color-foreground-muted);
        padding: var(--spacing-8);
      }
      .board__filters {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }
      .board__search {
        max-width: 280px;
      }
      .board__priority-filter {
        max-width: 180px;
        text-transform: capitalize;
      }
      .board__filter-count {
        font-size: var(--font-size-sm);
        color: var(--color-foreground-muted);
      }
      .board__filter-clear {
        border: none;
        background: transparent;
        color: var(--color-brand-600);
        cursor: pointer;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }
      .board__columns {
        display: flex;
        gap: var(--spacing-4);
        align-items: flex-start;
        overflow-x: auto;
        padding-bottom: var(--spacing-4);
        flex: 1;
        min-height: 0;
      }
      .board__column-wrap {
        height: 100%;
      }
      .board__column-wrap.cdk-drag-preview {
        box-shadow: var(--shadow-xl);
      }
      .board__columns.cdk-drop-list-dragging .board__column-wrap:not(.cdk-drag-placeholder) {
        transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
      }
      .board__add-column {
        flex: 0 0 auto;
        width: 280px;
      }
      .board__add-column-trigger {
        width: 100%;
        border: 1px dashed var(--color-neutral-300);
        background: transparent;
        color: var(--color-foreground-muted);
        border-radius: var(--radius-lg);
        padding: var(--spacing-3);
        cursor: pointer;
        font-size: var(--font-size-sm);
      }
      .board__add-column-trigger:hover {
        border-color: var(--color-brand-500);
        color: var(--color-foreground-default);
      }
      .add-column {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
        background: var(--color-background-subtle);
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-lg);
        padding: var(--spacing-3);
      }
      .add-column__input {
        padding: var(--spacing-2);
        border: 1px solid var(--color-neutral-300);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: var(--font-size-sm);
      }
    `,
  ],
})
export class BoardDetailComponent {
  readonly facade = inject(BoardDetailFacade);

  /** Bound from the `:boardId` route param via `withComponentInputBinding()`. */
  readonly boardId = input.required<string>();

  readonly tab = signal<BoardTab>('board');
  readonly selectedTaskId = signal<string | null>(null);
  readonly addingColumn = signal(false);
  readonly columnTitle = signal('');

  /** The live task object for the dialog, kept in sync as the store updates. */
  readonly selectedTask = computed<TaskDto | null>(() => {
    const id = this.selectedTaskId();
    return id ? (this.facade.allTasks().find((t) => t.id === id) ?? null) : null;
  });

  constructor() {
    effect(() => {
      const id = this.boardId();
      void this.facade.load(id);
    });
  }

  onDrop(event: CdkDragDrop<ReadonlyArray<TaskDto>>): void {
    const sameSpot =
      event.previousContainer === event.container && event.previousIndex === event.currentIndex;
    if (sameSpot) return;
    const task = event.item.data as TaskDto;
    void this.facade.moveTask(task.id, event.container.id, event.currentIndex);
  }

  readonly priorities = PRIORITIES;

  onPriorityFilter(value: string): void {
    this.facade.setPriorityFilter(value === '' ? null : (value as TaskPriority));
  }

  onColumnDrop(event: CdkDragDrop<ReadonlyArray<ColumnDto>>): void {
    if (event.previousIndex === event.currentIndex) return;
    const ids = this.facade.orderedColumns().map((c) => c.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    void this.facade.reorderColumns(ids);
  }

  /** Only columns (no `columnId`) may enter the horizontal column list. */
  readonly acceptColumns = (drag: CdkDrag): boolean =>
    !('columnId' in ((drag.data ?? {}) as object));
  /** Only tasks (which carry a `columnId`) may enter a card list. */
  readonly acceptTasks = (drag: CdkDrag): boolean => 'columnId' in ((drag.data ?? {}) as object);

  onAddTask(columnId: string, title: string): void {
    void this.facade.createTask({
      boardId: this.boardId(),
      columnId,
      title,
      priority: 'medium',
    });
  }

  onSaveTask(id: string, patch: UpdateTaskRequestDto): void {
    void this.facade.updateTask(id, patch);
    this.closeDialog();
  }

  onDeleteTask(task: TaskDto): void {
    void this.facade.deleteTask(task.id);
  }

  onAddAttachment(taskId: string, payload: AddTaskAttachmentRequestDto): void {
    void this.facade.addAttachment(taskId, payload);
  }

  onRemoveAttachment(taskId: string, attachmentId: string): void {
    void this.facade.removeAttachment(taskId, attachmentId);
  }

  setClient(clientId: string): void {
    void this.facade.setBoardClient(this.boardId(), clientId === '' ? null : clientId);
  }

  onDeleteColumn(columnId: string): void {
    void this.facade.deleteColumn(columnId);
  }

  submitColumn(event: Event): void {
    event.preventDefault();
    const title = this.columnTitle().trim();
    if (!title) return;
    void this.facade.addColumn(this.boardId(), title);
    this.columnTitle.set('');
    this.addingColumn.set(false);
  }

  openTask(task: TaskDto): void {
    this.selectedTaskId.set(task.id);
  }

  closeDialog(): void {
    this.selectedTaskId.set(null);
  }
}
