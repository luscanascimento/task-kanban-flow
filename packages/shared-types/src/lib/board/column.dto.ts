export interface ColumnDto {
  readonly id: string;
  readonly boardId: string;
  readonly title: string;
  readonly position: number;
  readonly color?: string;
  readonly wipLimit?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateColumnRequestDto {
  readonly boardId: string;
  readonly title: string;
  readonly position: number;
  readonly color?: string;
}

export interface UpdateColumnRequestDto {
  readonly title?: string;
  readonly position?: number;
  readonly color?: string;
  readonly wipLimit?: number;
}
