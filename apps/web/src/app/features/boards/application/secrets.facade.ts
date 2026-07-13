import { Injectable, inject } from '@angular/core';

import type {
  CreateProjectSecretRequestDto,
  UpdateProjectSecretRequestDto,
} from '@tkf/shared-types';

import { SECRET_REPOSITORY } from '../domain/secret.repository';
import { SecretsStore } from '../presentation/secrets-store';

/** Application-layer orchestrator for a board's secrets vault. */
@Injectable()
export class SecretsFacade {
  private readonly repo = inject(SECRET_REPOSITORY);
  private readonly store = inject(SecretsStore);

  readonly secrets = this.store.secrets;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;
  readonly count = this.store.count;

  async load(boardId: string): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setSecrets(await this.repo.listByBoard(boardId));
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load secrets.'));
    }
  }

  async create(boardId: string, payload: CreateProjectSecretRequestDto): Promise<void> {
    this.store.upsert(await this.repo.create(boardId, payload));
  }

  async update(id: string, payload: UpdateProjectSecretRequestDto): Promise<void> {
    this.store.upsert(await this.repo.update(id, payload));
  }

  async remove(id: string): Promise<void> {
    this.store.remove(id);
    try {
      await this.repo.remove(id);
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to delete secret.'));
    }
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
