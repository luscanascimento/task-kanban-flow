import type { UserDto } from '../auth/user.dto';

export type BoardVisibility = 'private' | 'workspace' | 'public';

export interface BoardDto {
  readonly id: string;
  /** The team that owns this board — access is granted through team membership. */
  readonly teamId: string;
  readonly title: string;
  readonly description?: string;
  readonly visibility: BoardVisibility;
  readonly ownerId: string;
  readonly members: ReadonlyArray<BoardMemberDto>;
  /** Optional client this board (project) is for. */
  readonly clientId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BoardMemberDto {
  readonly user: UserDto;
  readonly role: 'admin' | 'editor' | 'viewer';
  readonly joinedAt: string;
}

export interface CreateBoardRequestDto {
  readonly teamId: string;
  readonly title: string;
  readonly description?: string;
  readonly visibility: BoardVisibility;
  readonly clientId?: string;
}

export interface UpdateBoardRequestDto {
  readonly title?: string;
  readonly description?: string;
  readonly visibility?: BoardVisibility;
  readonly clientId?: string | null;
}
