import { Injectable, inject } from '@angular/core';

import type { CreateClientRequestDto, UpdateClientRequestDto } from '@tkf/shared-types';

import { CLIENT_REPOSITORY } from '../domain/client.repository';
import { ClientsStore } from '../presentation/clients-store';

/** Application-layer orchestrator for the clients list. */
@Injectable()
export class ClientsFacade {
  private readonly repo = inject(CLIENT_REPOSITORY);
  private readonly store = inject(ClientsStore);

  readonly clients = this.store.clients;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;

  async load(): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setClients(await this.repo.list());
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load clients.'));
    }
  }

  async create(payload: CreateClientRequestDto): Promise<void> {
    this.store.upsert(await this.repo.create(payload));
  }

  async update(id: string, payload: UpdateClientRequestDto): Promise<void> {
    this.store.upsert(await this.repo.update(id, payload));
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this.store.remove(id);
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
