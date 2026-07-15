import { http, HttpResponse } from 'msw';

import type {
  AddTaskAttachmentRequestDto,
  AddTeamMemberRequestDto,
  BoardDto,
  ClientDto,
  ColumnDto,
  CreateBoardRequestDto,
  CreateClientRequestDto,
  CreateColumnRequestDto,
  CreateProjectSecretRequestDto,
  CreateTaskRequestDto,
  CreateTeamRequestDto,
  MoveTaskRequestDto,
  ProjectSecretDto,
  TaskAttachmentDto,
  TaskDto,
  TeamDto,
  UpdateBoardRequestDto,
  UpdateClientRequestDto,
  UpdateColumnRequestDto,
  UpdateProjectSecretRequestDto,
  UpdateTaskRequestDto,
  UpdateTeamMemberRequestDto,
  UpdateTeamRequestDto,
} from '@tkf/shared-types';

import { db, kanban } from './kanban.db';

const notFound = (message: string) =>
  HttpResponse.json({ statusCode: 404, code: 'NOT_FOUND', message }, { status: 404 });

const byPosition = <T extends { position: number }>(a: T, b: T): number => a.position - b.position;

/**
 * MSW handlers for the kanban domain (boards, columns, tasks). Backed by
 * the in-memory `db`, so operations are stateful for the tab's lifetime.
 */
export const kanbanHandlers = [
  // Nested collection routes MUST precede `*/boards`: MSW matches the first
  // registered handler, and `*/boards` greedily matches any path ending in
  // `/boards` (including `/teams/:id/boards` and `/clients/:id/boards`).
  http.get('*/teams/:teamId/boards', ({ params }) =>
    HttpResponse.json(kanban.boardsForTeam(params['teamId'] as string)),
  ),
  http.get('*/clients/:id/boards', ({ params }) =>
    HttpResponse.json(db.boards.filter((b) => b.clientId === params['id'])),
  ),

  // --- Boards ---------------------------------------------------------------
  http.get('*/boards', () => HttpResponse.json(db.boards)),

  http.get('*/boards/:id', ({ params }) => {
    const board = db.boards.find((b) => b.id === params['id']);
    return board ? HttpResponse.json(board) : notFound('Board not found');
  }),

  http.post('*/boards', async ({ request }) => {
    const body = (await request.json()) as CreateBoardRequestDto;
    const boardId = kanban.newId('brd');
    const ts = kanban.timestamp();
    const owner = kanban.users()[0]!;
    const board: BoardDto = {
      id: boardId,
      teamId: body.teamId,
      title: body.title,
      visibility: body.visibility,
      ownerId: owner.id,
      members: [{ user: owner, role: 'admin', joinedAt: ts }],
      createdAt: ts,
      updatedAt: ts,
      ...(body.description ? { description: body.description } : {}),
      ...(body.clientId ? { clientId: body.clientId } : {}),
    };
    db.boards.push(board);
    db.columns.push(...kanban.defaultColumnsFor(boardId));
    return HttpResponse.json(board, { status: 201 });
  }),

  http.patch('*/boards/:id', async ({ params, request }) => {
    const idx = db.boards.findIndex((b) => b.id === params['id']);
    if (idx < 0) return notFound('Board not found');
    const patch = (await request.json()) as UpdateBoardRequestDto;
    const current = db.boards[idx]!;
    const { clientId, ...rest } = patch;
    const updated = {
      ...current,
      ...rest,
      clientId: clientId === null ? undefined : (clientId ?? current.clientId),
      updatedAt: kanban.timestamp(),
    } as BoardDto;
    db.boards[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete('*/boards/:id', ({ params }) => {
    const id = params['id'] as string;
    db.boards = db.boards.filter((b) => b.id !== id);
    db.columns = db.columns.filter((c) => c.boardId !== id);
    db.tasks = db.tasks.filter((t) => t.boardId !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Columns --------------------------------------------------------------
  http.get('*/boards/:boardId/columns', ({ params }) => {
    const columns = db.columns.filter((c) => c.boardId === params['boardId']).sort(byPosition);
    return HttpResponse.json(columns);
  }),

  http.post('*/boards/:boardId/columns/reorder', async ({ params, request }) => {
    const boardId = params['boardId'] as string;
    const { orderedColumnIds } = (await request.json()) as { orderedColumnIds: string[] };
    orderedColumnIds.forEach((columnId, position) => {
      const idx = db.columns.findIndex((c) => c.id === columnId && c.boardId === boardId);
      if (idx >= 0)
        db.columns[idx] = { ...db.columns[idx]!, position, updatedAt: kanban.timestamp() };
    });
    const columns = db.columns.filter((c) => c.boardId === boardId).sort(byPosition);
    return HttpResponse.json(columns);
  }),

  http.post('*/columns', async ({ request }) => {
    const body = (await request.json()) as CreateColumnRequestDto;
    const ts = kanban.timestamp();
    // Server assigns the next position authoritatively to avoid client-side
    // races where two concurrent creates compute the same index.
    const position = db.columns.filter((c) => c.boardId === body.boardId).length;
    const column: ColumnDto = {
      id: kanban.newId('col'),
      boardId: body.boardId,
      title: body.title,
      position,
      createdAt: ts,
      updatedAt: ts,
      ...(body.color ? { color: body.color } : {}),
    };
    db.columns.push(column);
    return HttpResponse.json(column, { status: 201 });
  }),

  http.patch('*/columns/:id', async ({ params, request }) => {
    const idx = db.columns.findIndex((c) => c.id === params['id']);
    if (idx < 0) return notFound('Column not found');
    const patch = (await request.json()) as UpdateColumnRequestDto;
    const updated: ColumnDto = { ...db.columns[idx]!, ...patch, updatedAt: kanban.timestamp() };
    db.columns[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete('*/columns/:id', ({ params }) => {
    const id = params['id'] as string;
    db.columns = db.columns.filter((c) => c.id !== id);
    db.tasks = db.tasks.filter((t) => t.columnId !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Tasks ----------------------------------------------------------------
  http.get('*/boards/:boardId/tasks', ({ params }) => {
    const tasks = db.tasks.filter((t) => t.boardId === params['boardId']).sort(byPosition);
    return HttpResponse.json(tasks);
  }),

  http.post('*/tasks', async ({ request }) => {
    const body = (await request.json()) as CreateTaskRequestDto;
    const ts = kanban.timestamp();
    const position = db.tasks.filter((t) => t.columnId === body.columnId).length;
    const assignee = body.assigneeId ? kanban.userById(body.assigneeId) : undefined;
    const task: TaskDto = {
      id: kanban.newId('tsk'),
      boardId: body.boardId,
      columnId: body.columnId,
      title: body.title,
      description: '',
      priority: body.priority,
      status: 'backlog',
      position,
      labels: [],
      checklistItems: [],
      attachments: [],
      commentCount: 0,
      attachmentCount: 0,
      createdAt: ts,
      updatedAt: ts,
      ...(body.assigneeId ? { assigneeId: body.assigneeId } : {}),
      ...(assignee ? { assignee } : {}),
      ...(body.dueDate ? { dueDate: body.dueDate } : {}),
      ...(body.clientId ? { clientId: body.clientId } : {}),
    };
    db.tasks.push(task);
    return HttpResponse.json(task, { status: 201 });
  }),

  http.patch('*/tasks/:id', async ({ params, request }) => {
    const idx = db.tasks.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Task not found');
    const patch = (await request.json()) as UpdateTaskRequestDto;
    const current = db.tasks[idx]!;
    const assignee =
      patch.assigneeId === undefined
        ? current.assignee
        : patch.assigneeId === null
          ? undefined
          : kanban.userById(patch.assigneeId);
    const updated: TaskDto = {
      ...current,
      ...patch,
      assigneeId: patch.assigneeId === null ? undefined : (patch.assigneeId ?? current.assigneeId),
      assignee,
      dueDate: patch.dueDate === null ? undefined : (patch.dueDate ?? current.dueDate),
      clientId: patch.clientId === null ? undefined : (patch.clientId ?? current.clientId),
      updatedAt: kanban.timestamp(),
    } as TaskDto;
    db.tasks[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.post('*/tasks/:id/move', async ({ params, request }) => {
    const idx = db.tasks.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Task not found');
    const { targetColumnId, targetPosition } = (await request.json()) as MoveTaskRequestDto;
    const task = db.tasks[idx]!;
    const sourceColumnId = task.columnId;

    // Remove from source, insert into target at the requested index.
    const moved: TaskDto = {
      ...task,
      columnId: targetColumnId,
      position: targetPosition,
      updatedAt: kanban.timestamp(),
    };
    db.tasks[idx] = moved;

    // Shift target-column siblings to make room, then re-densify both columns.
    db.tasks
      .filter(
        (t) => t.id !== moved.id && t.columnId === targetColumnId && t.position >= targetPosition,
      )
      .forEach((t) => {
        const i = db.tasks.findIndex((x) => x.id === t.id);
        if (i >= 0) db.tasks[i] = { ...t, position: t.position + 1 };
      });
    kanban.reindexColumn(targetColumnId);
    if (sourceColumnId !== targetColumnId) kanban.reindexColumn(sourceColumnId);

    return HttpResponse.json(db.tasks.find((t) => t.id === moved.id));
  }),

  http.delete('*/tasks/:id', ({ params }) => {
    const id = params['id'] as string;
    const task = db.tasks.find((t) => t.id === id);
    db.tasks = db.tasks.filter((t) => t.id !== id);
    if (task) kanban.reindexColumn(task.columnId);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Teams ----------------------------------------------------------------
  http.get('*/teams', () => HttpResponse.json(db.teams.map(kanban.withTeamCounts))),

  http.get('*/teams/:id', ({ params }) => {
    const team = db.teams.find((t) => t.id === params['id']);
    return team ? HttpResponse.json(kanban.withTeamCounts(team)) : notFound('Team not found');
  }),

  http.post('*/teams', async ({ request }) => {
    const body = (await request.json()) as CreateTeamRequestDto;
    const ts = kanban.timestamp();
    const owner = kanban.users()[0]!;
    const team: TeamDto = {
      id: kanban.newId('team'),
      name: body.name,
      ownerId: owner.id,
      members: [{ user: owner, role: 'owner', joinedAt: ts }],
      boardCount: 0,
      createdAt: ts,
      updatedAt: ts,
      ...(body.description ? { description: body.description } : {}),
    };
    db.teams.push(team);
    return HttpResponse.json(team, { status: 201 });
  }),

  http.patch('*/teams/:id', async ({ params, request }) => {
    const idx = db.teams.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Team not found');
    const patch = (await request.json()) as UpdateTeamRequestDto;
    const updated: TeamDto = { ...db.teams[idx]!, ...patch, updatedAt: kanban.timestamp() };
    db.teams[idx] = updated;
    return HttpResponse.json(kanban.withTeamCounts(updated));
  }),

  http.delete('*/teams/:id', ({ params }) => {
    const teamId = params['id'] as string;
    const boardIds = db.boards.filter((b) => b.teamId === teamId).map((b) => b.id);
    db.teams = db.teams.filter((t) => t.id !== teamId);
    db.boards = db.boards.filter((b) => b.teamId !== teamId);
    db.columns = db.columns.filter((c) => !boardIds.includes(c.boardId));
    db.tasks = db.tasks.filter((t) => !boardIds.includes(t.boardId));
    db.secrets = db.secrets.filter((s) => !boardIds.includes(s.boardId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/teams/:id/members', async ({ params, request }) => {
    const idx = db.teams.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Team not found');
    const body = (await request.json()) as AddTeamMemberRequestDto;
    const user = kanban.userByEmail(body.email);
    if (!user) {
      return HttpResponse.json(
        { statusCode: 404, code: 'USER_NOT_FOUND', message: `No user with email ${body.email}.` },
        { status: 404 },
      );
    }
    const team = db.teams[idx]!;
    if (team.members.some((m) => m.user.id === user.id)) {
      return HttpResponse.json(
        { statusCode: 409, code: 'ALREADY_MEMBER', message: 'User is already a member.' },
        { status: 409 },
      );
    }
    const updated: TeamDto = {
      ...team,
      members: [...team.members, { user, role: body.role, joinedAt: kanban.timestamp() }],
      updatedAt: kanban.timestamp(),
    };
    db.teams[idx] = updated;
    return HttpResponse.json(kanban.withTeamCounts(updated), { status: 201 });
  }),

  http.patch('*/teams/:id/members/:userId', async ({ params, request }) => {
    const idx = db.teams.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Team not found');
    const { role } = (await request.json()) as UpdateTeamMemberRequestDto;
    const team = db.teams[idx]!;
    const updated: TeamDto = {
      ...team,
      members: team.members.map((m) => (m.user.id === params['userId'] ? { ...m, role } : m)),
      updatedAt: kanban.timestamp(),
    };
    db.teams[idx] = updated;
    return HttpResponse.json(kanban.withTeamCounts(updated));
  }),

  http.delete('*/teams/:id/members/:userId', ({ params }) => {
    const idx = db.teams.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Team not found');
    const team = db.teams[idx]!;
    const updated: TeamDto = {
      ...team,
      members: team.members.filter((m) => m.user.id !== params['userId']),
      updatedAt: kanban.timestamp(),
    };
    db.teams[idx] = updated;
    return HttpResponse.json(kanban.withTeamCounts(updated));
  }),

  // --- Clients --------------------------------------------------------------
  http.get('*/clients', () => HttpResponse.json(db.clients.map(kanban.withClientCounts))),

  http.get('*/clients/:id', ({ params }) => {
    const client = db.clients.find((c) => c.id === params['id']);
    return client
      ? HttpResponse.json(kanban.withClientCounts(client))
      : notFound('Client not found');
  }),

  http.post('*/clients', async ({ request }) => {
    const body = (await request.json()) as CreateClientRequestDto;
    const ts = kanban.timestamp();
    const client: ClientDto = {
      id: kanban.newId('cli'),
      name: body.name,
      boardCount: 0,
      createdAt: ts,
      updatedAt: ts,
      ...(body.company ? { company: body.company } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
      ...(body.color ? { color: body.color } : {}),
    };
    db.clients.push(client);
    return HttpResponse.json(client, { status: 201 });
  }),

  http.patch('*/clients/:id', async ({ params, request }) => {
    const idx = db.clients.findIndex((c) => c.id === params['id']);
    if (idx < 0) return notFound('Client not found');
    const patch = (await request.json()) as UpdateClientRequestDto;
    const updated: ClientDto = { ...db.clients[idx]!, ...patch, updatedAt: kanban.timestamp() };
    db.clients[idx] = updated;
    return HttpResponse.json(kanban.withClientCounts(updated));
  }),

  http.delete('*/clients/:id', ({ params }) => {
    const clientId = params['id'] as string;
    db.clients = db.clients.filter((c) => c.id !== clientId);
    // Detach the client from boards/tasks/secrets (drop the key entirely rather
    // than setting it to undefined, per exactOptionalPropertyTypes).
    const detach = <T extends { clientId?: string }>(item: T): T => {
      if (item.clientId !== clientId) return item;
      const { clientId: _omit, ...rest } = item;
      return rest as T;
    };
    db.boards = db.boards.map(detach);
    db.tasks = db.tasks.map(detach);
    db.secrets = db.secrets.map(detach);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Secrets (per board) --------------------------------------------------
  http.get('*/boards/:boardId/secrets', ({ params }) =>
    HttpResponse.json(db.secrets.filter((s) => s.boardId === params['boardId'])),
  ),

  http.post('*/boards/:boardId/secrets', async ({ params, request }) => {
    const body = (await request.json()) as CreateProjectSecretRequestDto;
    const ts = kanban.timestamp();
    const secret: ProjectSecretDto = {
      id: kanban.newId('sec'),
      boardId: params['boardId'] as string,
      platform: body.platform,
      label: body.label,
      authType: body.authType,
      secret: body.secret,
      createdAt: ts,
      updatedAt: ts,
      ...(body.clientId ? { clientId: body.clientId } : {}),
      ...(body.username ? { username: body.username } : {}),
      ...(body.url ? { url: body.url } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    };
    db.secrets.push(secret);
    return HttpResponse.json(secret, { status: 201 });
  }),

  http.patch('*/secrets/:id', async ({ params, request }) => {
    const idx = db.secrets.findIndex((s) => s.id === params['id']);
    if (idx < 0) return notFound('Secret not found');
    const patch = (await request.json()) as UpdateProjectSecretRequestDto;
    const current = db.secrets[idx]!;
    const { clientId, ...rest } = patch;
    const updated = {
      ...current,
      ...rest,
      clientId: clientId === null ? undefined : (clientId ?? current.clientId),
      updatedAt: kanban.timestamp(),
    } as ProjectSecretDto;
    db.secrets[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete('*/secrets/:id', ({ params }) => {
    db.secrets = db.secrets.filter((s) => s.id !== params['id']);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Task attachments (prints) -------------------------------------------
  http.post('*/tasks/:id/attachments', async ({ params, request }) => {
    const idx = db.tasks.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Task not found');
    const body = (await request.json()) as AddTaskAttachmentRequestDto;
    const attachment: TaskAttachmentDto = {
      id: kanban.newId('att'),
      name: body.name,
      mimeType: body.mimeType,
      url: body.url,
      sizeBytes: body.sizeBytes,
      createdAt: kanban.timestamp(),
    };
    const task = db.tasks[idx]!;
    const attachments = [...task.attachments, attachment];
    db.tasks[idx] = {
      ...task,
      attachments,
      attachmentCount: attachments.length,
      updatedAt: kanban.timestamp(),
    };
    return HttpResponse.json(db.tasks[idx], { status: 201 });
  }),

  http.delete('*/tasks/:id/attachments/:attId', ({ params }) => {
    const idx = db.tasks.findIndex((t) => t.id === params['id']);
    if (idx < 0) return notFound('Task not found');
    const task = db.tasks[idx]!;
    const attachments = task.attachments.filter((a) => a.id !== params['attId']);
    db.tasks[idx] = {
      ...task,
      attachments,
      attachmentCount: attachments.length,
      updatedAt: kanban.timestamp(),
    };
    return HttpResponse.json(db.tasks[idx]);
  }),

  // --- Users (for assignee pickers) ----------------------------------------
  http.get('*/users', () => HttpResponse.json(kanban.users())),
];
