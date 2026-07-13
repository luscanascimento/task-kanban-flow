import { InjectionToken } from '@angular/core';

import type {
  CreateProjectSecretRequestDto,
  ProjectSecretDto,
  UpdateProjectSecretRequestDto,
} from '@tkf/shared-types';

/**
 * Port for the per-board secrets vault (client accounts/credentials used on a
 * project). Scoped to a board; see the security note on `ProjectSecretDto`.
 */
export interface SecretRepository {
  listByBoard(boardId: string): Promise<ReadonlyArray<ProjectSecretDto>>;
  create(boardId: string, payload: CreateProjectSecretRequestDto): Promise<ProjectSecretDto>;
  update(id: string, payload: UpdateProjectSecretRequestDto): Promise<ProjectSecretDto>;
  remove(id: string): Promise<void>;
}

export const SECRET_REPOSITORY = new InjectionToken<SecretRepository>('SECRET_REPOSITORY');
