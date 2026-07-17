import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import type {
  AddTeamMemberRequestDto,
  BoardDto,
  CreateTeamRequestDto,
  TeamDto,
  UpdateTeamMemberRequestDto,
  UpdateTeamRequestDto,
} from '@tkf/shared-types';

import { environment } from '../../../../environments/environment';
import { type TeamRepository } from '../domain/team.repository';
import { type ListResponse, unwrapItems } from '../../../shared/util/unwrap-items';

/** HTTP adapter for `TeamRepository`. */
@Injectable({ providedIn: 'root' })
export class HttpTeamRepository implements TeamRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/teams`;

  list(): Promise<ReadonlyArray<TeamDto>> {
    return firstValueFrom(this.http.get<ListResponse<TeamDto>>(this.baseUrl)).then(unwrapItems);
  }

  getById(id: string): Promise<TeamDto> {
    return firstValueFrom(this.http.get<TeamDto>(`${this.baseUrl}/${id}`));
  }

  listBoards(teamId: string): Promise<ReadonlyArray<BoardDto>> {
    return firstValueFrom(
      this.http.get<ListResponse<BoardDto>>(`${this.baseUrl}/${teamId}/boards`),
    ).then(unwrapItems);
  }

  create(payload: CreateTeamRequestDto): Promise<TeamDto> {
    return firstValueFrom(this.http.post<TeamDto>(this.baseUrl, payload));
  }

  update(id: string, payload: UpdateTeamRequestDto): Promise<TeamDto> {
    return firstValueFrom(this.http.patch<TeamDto>(`${this.baseUrl}/${id}`, payload));
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  addMember(teamId: string, payload: AddTeamMemberRequestDto): Promise<TeamDto> {
    return firstValueFrom(this.http.post<TeamDto>(`${this.baseUrl}/${teamId}/members`, payload));
  }

  updateMember(
    teamId: string,
    userId: string,
    payload: UpdateTeamMemberRequestDto,
  ): Promise<TeamDto> {
    return firstValueFrom(
      this.http.patch<TeamDto>(`${this.baseUrl}/${teamId}/members/${userId}`, payload),
    );
  }

  removeMember(teamId: string, userId: string): Promise<TeamDto> {
    return firstValueFrom(this.http.delete<TeamDto>(`${this.baseUrl}/${teamId}/members/${userId}`));
  }
}
