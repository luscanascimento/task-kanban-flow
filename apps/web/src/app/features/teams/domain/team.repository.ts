import { InjectionToken } from '@angular/core';

import type {
  AddTeamMemberRequestDto,
  BoardDto,
  CreateTeamRequestDto,
  TeamDto,
  UpdateTeamMemberRequestDto,
  UpdateTeamRequestDto,
} from '@tkf/shared-types';

/**
 * Port for team persistence. A team is the access boundary that owns boards;
 * membership operations live here since they govern who can see those boards.
 */
export interface TeamRepository {
  list(): Promise<ReadonlyArray<TeamDto>>;
  getById(id: string): Promise<TeamDto>;
  listBoards(teamId: string): Promise<ReadonlyArray<BoardDto>>;
  create(payload: CreateTeamRequestDto): Promise<TeamDto>;
  update(id: string, payload: UpdateTeamRequestDto): Promise<TeamDto>;
  remove(id: string): Promise<void>;
  addMember(teamId: string, payload: AddTeamMemberRequestDto): Promise<TeamDto>;
  updateMember(
    teamId: string,
    userId: string,
    payload: UpdateTeamMemberRequestDto,
  ): Promise<TeamDto>;
  removeMember(teamId: string, userId: string): Promise<TeamDto>;
}

export const TEAM_REPOSITORY = new InjectionToken<TeamRepository>('TEAM_REPOSITORY');
