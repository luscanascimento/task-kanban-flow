import type { FastifyRequest } from 'fastify';
import type { ColumnDto, TaskDto, TeamRole } from '@tkf/shared-types';
import type { SecretMetadataDto } from '../repositories/secrets.repo.js';
import type { App } from '../types.js';
import { forbidden, notFound } from './errors.js';
import { getPrincipal } from './principal.js';

/**
 * Authorization guards. Everything reachable in this API hangs off a team or a
 * board membership, so every route funnels through one of these helpers before
 * touching a repository.
 *
 * A resource the caller may not reach answers 404, never 403 — a 403 would
 * confirm the id exists and leak another tenant's inventory. 403 is reserved
 * for the case where the caller *is* a member but lacks the role.
 */

export function requireBoard(app: App, request: FastifyRequest, boardId: string): void {
  if (!app.repos.boards.canAccess(getPrincipal(request).userId, boardId)) {
    throw notFound('Board not found');
  }
}

export function requireTask(app: App, request: FastifyRequest, taskId: string): TaskDto {
  const task = app.repos.tasks.get(taskId);
  if (!task || !app.repos.boards.canAccess(getPrincipal(request).userId, task.boardId)) {
    throw notFound('Task not found');
  }
  return task;
}

export function requireColumn(app: App, request: FastifyRequest, columnId: string): ColumnDto {
  const column = app.repos.columns.get(columnId);
  if (!column || !app.repos.boards.canAccess(getPrincipal(request).userId, column.boardId)) {
    throw notFound('Column not found');
  }
  return column;
}

export function requireSecret(
  app: App,
  request: FastifyRequest,
  secretId: string,
): SecretMetadataDto {
  const secret = app.repos.secrets.get(secretId);
  if (!secret || !app.repos.boards.canAccess(getPrincipal(request).userId, secret.boardId)) {
    throw notFound('Secret not found');
  }
  return secret;
}

/**
 * Team RBAC: `owner` > `admin` > `member`. Non-members get 404 (the team is
 * invisible to them); members without the required role get 403.
 */
export function requireTeamRole(
  app: App,
  request: FastifyRequest,
  teamId: string,
  allowed: readonly TeamRole[],
): TeamRole {
  const role = app.repos.teams.roleOf(getPrincipal(request).userId, teamId);
  if (!role) {
    throw notFound('Team not found');
  }
  if (!allowed.includes(role)) {
    throw forbidden(`This action requires one of: ${allowed.join(', ')}`, 'insufficient_role');
  }
  return role;
}
