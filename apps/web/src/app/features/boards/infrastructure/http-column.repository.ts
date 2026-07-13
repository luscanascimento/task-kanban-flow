import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type { ColumnDto, CreateColumnRequestDto, UpdateColumnRequestDto } from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type ColumnRepository } from '../domain/column.repository';

/** HTTP adapter for `ColumnRepository`. */
@Injectable({ providedIn: 'root' })
export class HttpColumnRepository implements ColumnRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  listByBoard(boardId: string): Promise<ReadonlyArray<ColumnDto>> {
    return firstValueFrom(
      this.http.get<ReadonlyArray<ColumnDto>>(`${this.baseUrl}/boards/${boardId}/columns`),
    );
  }

  create(payload: CreateColumnRequestDto): Promise<ColumnDto> {
    return firstValueFrom(this.http.post<ColumnDto>(`${this.baseUrl}/columns`, payload));
  }

  update(id: string, payload: UpdateColumnRequestDto): Promise<ColumnDto> {
    return firstValueFrom(this.http.patch<ColumnDto>(`${this.baseUrl}/columns/${id}`, payload));
  }

  reorder(
    boardId: string,
    orderedColumnIds: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<ColumnDto>> {
    return firstValueFrom(
      this.http.post<ReadonlyArray<ColumnDto>>(
        `${this.baseUrl}/boards/${boardId}/columns/reorder`,
        { orderedColumnIds },
      ),
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/columns/${id}`));
  }
}
