import { Injectable, inject } from '@angular/core';

import type { CreateApiKeyRequestDto, CreatedApiKeyDto } from '@tkf/shared-types';

import { API_KEY_REPOSITORY } from '../domain/api-key.repository';
import { ApiKeysStore } from '../presentation/api-keys-store';

/** Application-layer orchestrator for API-key management. */
@Injectable()
export class ApiKeysFacade {
  private readonly repo = inject(API_KEY_REPOSITORY);
  private readonly store = inject(ApiKeysStore);

  readonly keys = this.store.keys;
  readonly activeKeys = this.store.activeKeys;
  readonly isLoading = this.store.isLoading;
  readonly error = this.store.error;
  readonly isEmpty = this.store.isEmpty;

  async load(): Promise<void> {
    try {
      this.store.setLoading(true);
      this.store.setError(null);
      this.store.setKeys(await this.repo.list());
    } catch (e) {
      this.store.setError(toMessage(e, 'Failed to load API keys.'));
    }
  }

  /** Creates a key and returns the plaintext value ONCE for display. */
  async create(payload: CreateApiKeyRequestDto): Promise<CreatedApiKeyDto> {
    const created = await this.repo.create(payload);
    // Store the metadata; the plaintext `key` is returned to the caller only.
    const { key: _key, ...metadata } = created;
    this.store.upsert(metadata);
    return created;
  }

  async revoke(id: string): Promise<void> {
    await this.repo.revoke(id);
    this.store.markRevoked(id);
  }
}

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}
