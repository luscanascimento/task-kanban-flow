import type { Db } from '../db/client.js';
import { createUsersRepo, type UsersRepo } from './users.repo.js';
import { createApiKeysRepo, type ApiKeysRepo } from './api-keys.repo.js';
import { createRefreshTokensRepo, type RefreshTokensRepo } from './refresh-tokens.repo.js';
import { createClientsRepo, type ClientsRepo } from './clients.repo.js';
import { createTeamsRepo, type TeamsRepo } from './teams.repo.js';
import { createBoardsRepo, type BoardsRepo } from './boards.repo.js';
import { createColumnsRepo, type ColumnsRepo } from './columns.repo.js';
import { createTasksRepo, type TasksRepo } from './tasks.repo.js';
import { createSecretsRepo, type SecretsRepo } from './secrets.repo.js';

export interface Repositories {
  readonly users: UsersRepo;
  readonly apiKeys: ApiKeysRepo;
  readonly refreshTokens: RefreshTokensRepo;
  readonly clients: ClientsRepo;
  readonly teams: TeamsRepo;
  readonly boards: BoardsRepo;
  readonly columns: ColumnsRepo;
  readonly tasks: TasksRepo;
  readonly secrets: SecretsRepo;
}

export function createRepositories(db: Db, secretsEncKey: Buffer): Repositories {
  return {
    users: createUsersRepo(db),
    apiKeys: createApiKeysRepo(db),
    refreshTokens: createRefreshTokensRepo(db),
    clients: createClientsRepo(db),
    teams: createTeamsRepo(db),
    boards: createBoardsRepo(db),
    columns: createColumnsRepo(db),
    tasks: createTasksRepo(db),
    secrets: createSecretsRepo(db, secretsEncKey),
  };
}
