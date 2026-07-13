import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  BoardDto,
  ClientDto,
  CreateClientRequestDto,
  UpdateClientRequestDto,
} from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type ClientRepository } from '../domain/client.repository';

/** HTTP adapter for `ClientRepository`. */
@Injectable({ providedIn: 'root' })
export class HttpClientRepository implements ClientRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clients`;

  list(): Promise<ReadonlyArray<ClientDto>> {
    return firstValueFrom(this.http.get<ReadonlyArray<ClientDto>>(this.baseUrl));
  }

  getById(id: string): Promise<ClientDto> {
    return firstValueFrom(this.http.get<ClientDto>(`${this.baseUrl}/${id}`));
  }

  listBoards(clientId: string): Promise<ReadonlyArray<BoardDto>> {
    return firstValueFrom(
      this.http.get<ReadonlyArray<BoardDto>>(`${this.baseUrl}/${clientId}/boards`),
    );
  }

  create(payload: CreateClientRequestDto): Promise<ClientDto> {
    return firstValueFrom(this.http.post<ClientDto>(this.baseUrl, payload));
  }

  update(id: string, payload: UpdateClientRequestDto): Promise<ClientDto> {
    return firstValueFrom(this.http.patch<ClientDto>(`${this.baseUrl}/${id}`, payload));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
