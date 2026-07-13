import { Injectable, inject } from '@angular/core';

import type { CreateTeamRequestDto } from '@tkf/shared-types';

import { TEAM_REPOSITORY } from '../domain/team.repository';
import { TeamsStore } from '../presentation/teams-store';

/** Application-layer orchestrator for the teams list. */
@Injectable()
export class TeamsFacade {
  private readonly repo = inject(TEAM_REPOSITORY);
  private readonly store = inject(TeamsStore);

  readonly teams = this.store.teams;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;

  async load(): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setTeams(await this.repo.list());
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load teams.'));
    }
  }

  async create(payload: CreateTeamRequestDto): Promise<void> {
    this.store.upsert(await this.repo.create(payload));
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this.store.remove(id);
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
