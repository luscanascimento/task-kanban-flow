import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { ApiKeyDto, CreateApiKeyRequestDto, CreatedApiKeyDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type ApiKeyRepository } from '../domain/api-key.repository';
import { type ListResponse, unwrapItems } from '../../../shared/util/unwrap-items';

/**
 * HTTP adapter for `ApiKeyRepository`.
 *
 * Hits `${apiBaseUrl}/keys` — the real backend's key-management endpoint
 * (`/api/v1/keys`), which requires a signed-in user session. MSW mirrors it.
 */
@Injectable({ providedIn: 'root' })
export class HttpApiKeyRepository implements ApiKeyRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/keys`;

  list(): Promise<ReadonlyArray<ApiKeyDto>> {
    return firstValueFrom(this.http.get<ListResponse<ApiKeyDto>>(this.baseUrl)).then(unwrapItems);
  }

  create(payload: CreateApiKeyRequestDto): Promise<CreatedApiKeyDto> {
    return firstValueFrom(this.http.post<CreatedApiKeyDto>(this.baseUrl, payload));
  }

  revoke(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
