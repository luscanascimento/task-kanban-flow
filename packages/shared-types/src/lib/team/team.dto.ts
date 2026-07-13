import type { UserDto } from '../auth/user.dto';

/**
 * A team is the top-level access boundary: it owns boards, and its members
 * see every board in the team. The member's `role` governs what they may
 * manage (boards, members, secrets).
 */
export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMemberDto {
  readonly user: UserDto;
  readonly role: TeamRole;
  readonly joinedAt: string;
}

export interface TeamDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly ownerId: string;
  readonly members: ReadonlyArray<TeamMemberDto>;
  readonly boardCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTeamRequestDto {
  readonly name: string;
  readonly description?: string;
}

export interface UpdateTeamRequestDto {
  readonly name?: string;
  readonly description?: string;
}

export interface AddTeamMemberRequestDto {
  /** Email of an existing user to invite into the team. */
  readonly email: string;
  readonly role: TeamRole;
}

export interface UpdateTeamMemberRequestDto {
  readonly role: TeamRole;
}
