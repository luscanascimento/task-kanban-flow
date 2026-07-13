import { Injectable, inject } from '@angular/core';

import { CLIENT_REPOSITORY } from '../domain/client.repository';
import { ClientDetailStore } from '../presentation/client-detail-store';

/** Application-layer orchestrator for a single client and its boards. */
@Injectable()
export class ClientDetailFacade {
  private readonly repo = inject(CLIENT_REPOSITORY);
  private readonly store = inject(ClientDetailStore);

  readonly client = this.store.client;
  readonly boards = this.store.boards;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly hasBoards = this.store.hasBoards;

  async load(clientId: string): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setError(null);
      const [client, boards] = await Promise.all([
        this.repo.getById(clientId),
        this.repo.listBoards(clientId),
      ]);
      this.store.setClient(client);
      this.store.setBoards(boards);
      this.store.setLoading(false);
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load client.'));
    }
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
