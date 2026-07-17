import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { ApiKeyDto, CreateApiKeyRequestDto, CreatedApiKeyDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type ApiKeyRepository } from '../domain/api-key.repository';

/**
 * HTTP adapter for `ApiKeyRepository`.
 *
 * In the mock world this hits MSW at `${apiBaseUrl}/api-keys`. Against the real
 * backend (`apps/api`) the equivalent endpoint is `/api/v1/keys` and requires a
 * signed-in user session; only the base path differs.
 */
@Injectable({ providedIn: 'root' })
export class HttpApiKeyRepository implements ApiKeyRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api-keys`;

  list(): Promise<ReadonlyArray<ApiKeyDto>> {
    return firstValueFrom(this.http.get<ReadonlyArray<ApiKeyDto>>(this.baseUrl));
  }

  create(payload: CreateApiKeyRequestDto): Promise<CreatedApiKeyDto> {
    return firstValueFrom(this.http.post<CreatedApiKeyDto>(this.baseUrl, payload));
  }

  revoke(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
