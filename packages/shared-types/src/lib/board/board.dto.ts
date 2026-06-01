import type { UserDto } from '../auth/user.dto';

export type BoardVisibility = 'private' | 'workspace' | 'public';

export interface BoardDto {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly visibility: BoardVisibility;
  readonly ownerId: string;
  readonly members: ReadonlyArray<BoardMemberDto>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BoardMemberDto {
  readonly user: UserDto;
  readonly role: 'admin' | 'editor' | 'viewer';
  readonly joinedAt: string;
}

export interface CreateBoardRequestDto {
  readonly title: string;
  readonly description?: string;
  readonly visibility: BoardVisibility;
}

export interface UpdateBoardRequestDto {
  readonly title?: string;
  readonly description?: string;
  readonly visibility?: BoardVisibility;
}
