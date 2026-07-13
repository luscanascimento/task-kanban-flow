import { InjectionToken } from '@angular/core';

import type {
  BoardDto,
  ClientDto,
  CreateClientRequestDto,
  UpdateClientRequestDto,
} from '@tkf/shared-types';

/** Port for the global client registry. */
export interface ClientRepository {
  list(): Promise<ReadonlyArray<ClientDto>>;
  getById(id: string): Promise<ClientDto>;
  listBoards(clientId: string): Promise<ReadonlyArray<BoardDto>>;
  create(payload: CreateClientRequestDto): Promise<ClientDto>;
  update(id: string, payload: UpdateClientRequestDto): Promise<ClientDto>;
  remove(id: string): Promise<void>;
}

export const CLIENT_REPOSITORY = new InjectionToken<ClientRepository>('CLIENT_REPOSITORY');
