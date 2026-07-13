import { Injectable, inject } from '@angular/core';

import type { AddTeamMemberRequestDto, CreateBoardRequestDto, TeamRole } from '@tkf/shared-types';

import { BOARD_REPOSITORY } from '../../boards/domain/board.repository';
import { TEAM_REPOSITORY } from '../domain/team.repository';
import { TeamDetailStore } from '../presentation/team-detail-store';

/**
 * Application-layer orchestrator for a single team: loads the team with its
 * boards, manages membership, and creates boards inside the team.
 */
@Injectable()
export class TeamDetailFacade {
  private readonly teams = inject(TEAM_REPOSITORY);
  private readonly boards = inject(BOARD_REPOSITORY);
  private readonly store = inject(TeamDetailStore);

  readonly team = this.store.team;
  readonly boards$ = this.store.boards;
  readonly members = this.store.members;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;

  async load(teamId: string): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setError(null);
      const [team, boards] = await Promise.all([
        this.teams.getById(teamId),
        this.teams.listBoards(teamId),
      ]);
      this.store.setTeam(team);
      this.store.setBoards(boards);
      this.store.setLoading(false);
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load team.'));
    }
  }

  async createBoard(payload: CreateBoardRequestDto): Promise<void> {
    this.store.addBoard(await this.boards.create(payload));
  }

  async deleteBoard(id: string): Promise<void> {
    this.store.removeBoard(id);
    try {
      await this.boards.remove(id);
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to delete board.'));
    }
  }

  async addMember(teamId: string, payload: AddTeamMemberRequestDto): Promise<void> {
    try {
      this.store.setTeam(await this.teams.addMember(teamId, payload));
    } catch (e) {
      this.store.setError(toMessage(e, 'Could not add member — check the email.'));
    }
  }

  async changeMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
    this.store.setTeam(await this.teams.updateMember(teamId, userId, { role }));
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    this.store.setTeam(await this.teams.removeMember(teamId, userId));
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
