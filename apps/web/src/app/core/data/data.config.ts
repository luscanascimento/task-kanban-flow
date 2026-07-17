import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { CLIENT_REPOSITORY } from '../../features/clients/domain/client.repository';
import { HttpClientRepository } from '../../features/clients/infrastructure/http-client.repository';
import { BOARD_REPOSITORY } from '../../features/boards/domain/board.repository';
import { COLUMN_REPOSITORY } from '../../features/boards/domain/column.repository';
import { SECRET_REPOSITORY } from '../../features/boards/domain/secret.repository';
import { TASK_REPOSITORY } from '../../features/boards/domain/task.repository';
import { HttpBoardRepository } from '../../features/boards/infrastructure/http-board.repository';
import { HttpColumnRepository } from '../../features/boards/infrastructure/http-column.repository';
import { HttpSecretRepository } from '../../features/boards/infrastructure/http-secret.repository';
import { HttpTaskRepository } from '../../features/boards/infrastructure/http-task.repository';
import { TEAM_REPOSITORY } from '../../features/teams/domain/team.repository';
import { HttpTeamRepository } from '../../features/teams/infrastructure/http-team.repository';
import { API_KEY_REPOSITORY } from '../../features/api-keys/domain/api-key.repository';
import { HttpApiKeyRepository } from '../../features/api-keys/infrastructure/http-api-key.repository';

/**
 * Bind every kanban hexagonal port to its HTTP adapter, once, at the app
 * root. The adapters are stateless, so root scope is safe and lets any
 * feature (teams need boards, boards need secrets, …) depend on any port
 * without cross-feature `provideX()` duplication. Stateful pieces (the Signal
 * Stores) stay scoped to their feature routes.
 */
export function provideKanbanData(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: TEAM_REPOSITORY, useClass: HttpTeamRepository },
    { provide: BOARD_REPOSITORY, useClass: HttpBoardRepository },
    { provide: COLUMN_REPOSITORY, useClass: HttpColumnRepository },
    { provide: TASK_REPOSITORY, useClass: HttpTaskRepository },
    { provide: CLIENT_REPOSITORY, useClass: HttpClientRepository },
    { provide: SECRET_REPOSITORY, useClass: HttpSecretRepository },
    { provide: API_KEY_REPOSITORY, useClass: HttpApiKeyRepository },
  ]);
}
