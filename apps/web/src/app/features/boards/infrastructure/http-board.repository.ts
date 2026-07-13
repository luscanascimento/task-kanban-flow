import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { BoardDto, CreateBoardRequestDto, UpdateBoardRequestDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type BoardRepository } from '../domain/board.repository';

/**
 * HTTP adapter for `BoardRepository`. Talks to the real API — or, in
 * dev/test, to MSW. Keep it thin: business rules belong in the
 * application/domain layers, not here.
 */
@Injectable({ providedIn: 'root' })
export class HttpBoardRepository implements BoardRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/boards`;

  list(): Promise<ReadonlyArray<BoardDto>> {
    return firstValueFrom(this.http.get<ReadonlyArray<BoardDto>>(this.baseUrl));
  }

  getById(id: string): Promise<BoardDto> {
    return firstValueFrom(this.http.get<BoardDto>(`${this.baseUrl}/${id}`));
  }

  create(payload: CreateBoardRequestDto): Promise<BoardDto> {
    return firstValueFrom(this.http.post<BoardDto>(this.baseUrl, payload));
  }

  update(id: string, payload: UpdateBoardRequestDto): Promise<BoardDto> {
    return firstValueFrom(this.http.patch<BoardDto>(`${this.baseUrl}/${id}`, payload));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
