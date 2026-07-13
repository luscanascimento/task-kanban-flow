import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  CreateProjectSecretRequestDto,
  ProjectSecretDto,
  UpdateProjectSecretRequestDto,
} from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type SecretRepository } from '../domain/secret.repository';

/** HTTP adapter for `SecretRepository`. */
@Injectable({ providedIn: 'root' })
export class HttpSecretRepository implements SecretRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listByBoard(boardId: string): Promise<ReadonlyArray<ProjectSecretDto>> {
    return firstValueFrom(
      this.http.get<ReadonlyArray<ProjectSecretDto>>(`${this.baseUrl}/boards/${boardId}/secrets`),
    );
  }

  create(boardId: string, payload: CreateProjectSecretRequestDto): Promise<ProjectSecretDto> {
    return firstValueFrom(
      this.http.post<ProjectSecretDto>(`${this.baseUrl}/boards/${boardId}/secrets`, payload),
    );
  }

  update(id: string, payload: UpdateProjectSecretRequestDto): Promise<ProjectSecretDto> {
    return firstValueFrom(
      this.http.patch<ProjectSecretDto>(`${this.baseUrl}/secrets/${id}`, payload),
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/secrets/${id}`));
  }
}
