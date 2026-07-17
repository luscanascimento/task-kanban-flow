import { InjectionToken } from '@angular/core';

import type { ApiKeyDto, CreateApiKeyRequestDto, CreatedApiKeyDto } from '@tkf/shared-types';

/** Port for managing the signed-in user's API keys. */
export interface ApiKeyRepository {
  list(): Promise<ReadonlyArray<ApiKeyDto>>;
  /** Creates a key and returns it WITH the plaintext value (shown once). */
  create(payload: CreateApiKeyRequestDto): Promise<CreatedApiKeyDto>;
  /** Revokes (soft-deletes) a key. */
  revoke(id: string): Promise<void>;
}

export const API_KEY_REPOSITORY = new InjectionToken<ApiKeyRepository>('API_KEY_REPOSITORY');
