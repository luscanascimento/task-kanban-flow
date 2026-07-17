import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TkfApiError, type TkfClient } from './client.js';

interface ToolResult {
  [x: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function text(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/** Wrap a handler so REST failures surface as readable tool errors, not crashes. */
function guard(handler: () => Promise<ToolResult>): Promise<ToolResult> {
  return handler().catch((err: unknown) => {
    const message =
      err instanceof TkfApiError
        ? `API ${err.statusCode} (${err.code}): ${err.message}`
        : String(err);
    return { content: [{ type: 'text' as const, text: message }], isError: true };
  });
}

// Only include keys the user actually provided (avoid sending nulls/undefined).
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k as keyof T] = v as T[keyof T];
    }
  }
  return out;
}

const priority = z.enum(['lowest', 'low', 'medium', 'high', 'urgent']);

export function registerTools(server: McpServer, client: TkfClient): void {
  // ── Boards ────────────────────────────────────────────────────────────────
  server.registerTool(
    'list_boards',
    {
      description: 'List all boards, optionally filtered by team.',
      inputSchema: { teamId: z.string().optional() },
    },
    async ({ teamId }) =>
      guard(() =>
        client
          .get(`/api/v1/boards${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''}`)
          .then(text),
      ),
  );

  server.registerTool(
    'get_board',
    {
      description: 'Get a single board by id (includes members).',
      inputSchema: { boardId: z.string() },
    },
    async ({ boardId }) => guard(() => client.get(`/api/v1/boards/${boardId}`).then(text)),
  );

  server.registerTool(
    'create_board',
    {
      description: 'Create a board inside a team. Requires a read_write API key.',
      inputSchema: {
        teamId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        visibility: z.enum(['private', 'workspace', 'public']).optional(),
        clientId: z.string().optional(),
      },
    },
    async (args) => guard(() => client.post('/api/v1/boards', compact(args)).then(text)),
  );

  server.registerTool(
    'update_board',
    {
      description: 'Update a board. Requires a read_write API key.',
      inputSchema: {
        boardId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        visibility: z.enum(['private', 'workspace', 'public']).optional(),
        clientId: z.string().nullable().optional(),
      },
    },
    async ({ boardId, ...rest }) =>
      guard(() => client.patch(`/api/v1/boards/${boardId}`, compact(rest)).then(text)),
  );

  server.registerTool(
    'delete_board',
    {
      description: 'Delete a board and its columns/tasks. Requires a read_write API key.',
      inputSchema: { boardId: z.string() },
    },
    async ({ boardId }) =>
      guard(() =>
        client.delete(`/api/v1/boards/${boardId}`).then(() => text({ deleted: boardId })),
      ),
  );

  // ── Columns ─────────────────────────────────────────────────────────────────
  server.registerTool(
    'list_columns',
    { description: 'List the columns of a board (ordered).', inputSchema: { boardId: z.string() } },
    async ({ boardId }) => guard(() => client.get(`/api/v1/boards/${boardId}/columns`).then(text)),
  );

  server.registerTool(
    'create_column',
    {
      description: 'Create a column on a board. Requires a read_write API key.',
      inputSchema: {
        boardId: z.string(),
        title: z.string(),
        position: z.number().int().min(0),
        color: z.string().optional(),
      },
    },
    async ({ boardId, ...rest }) =>
      guard(() => client.post(`/api/v1/boards/${boardId}/columns`, compact(rest)).then(text)),
  );

  server.registerTool(
    'reorder_columns',
    {
      description: "Reorder a board's columns by supplying the full ordered list of column ids.",
      inputSchema: { boardId: z.string(), orderedIds: z.array(z.string()) },
    },
    async ({ boardId, orderedIds }) =>
      guard(() =>
        client.post(`/api/v1/boards/${boardId}/columns/reorder`, { orderedIds }).then(text),
      ),
  );

  // ── Tasks ─────────────────────────────────────────────────────────────────
  server.registerTool(
    'list_tasks',
    {
      description: 'List all tasks on a board (across columns).',
      inputSchema: { boardId: z.string() },
    },
    async ({ boardId }) => guard(() => client.get(`/api/v1/boards/${boardId}/tasks`).then(text)),
  );

  server.registerTool(
    'get_task',
    { description: 'Get a single task by id.', inputSchema: { taskId: z.string() } },
    async ({ taskId }) => guard(() => client.get(`/api/v1/tasks/${taskId}`).then(text)),
  );

  server.registerTool(
    'create_task',
    {
      description: 'Create a task in a column. Requires a read_write API key.',
      inputSchema: {
        boardId: z.string(),
        columnId: z.string(),
        title: z.string(),
        priority: priority.optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().optional(),
        clientId: z.string().optional(),
      },
    },
    async ({ boardId, ...rest }) =>
      guard(() => client.post(`/api/v1/boards/${boardId}/tasks`, compact(rest)).then(text)),
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Update task fields (title, description, priority, status, assignee, due date, client).',
      inputSchema: {
        taskId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: priority.optional(),
        status: z.enum(['backlog', 'in_progress', 'blocked', 'done', 'cancelled']).optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        clientId: z.string().nullable().optional(),
      },
    },
    async ({ taskId, ...rest }) =>
      guard(() => client.patch(`/api/v1/tasks/${taskId}`, compact(rest)).then(text)),
  );

  server.registerTool(
    'move_task',
    {
      description: 'Move a task to a column and position (0-based). Requires a read_write API key.',
      inputSchema: {
        taskId: z.string(),
        targetColumnId: z.string(),
        targetPosition: z.number().int().min(0),
      },
    },
    async ({ taskId, targetColumnId, targetPosition }) =>
      guard(() =>
        client.post(`/api/v1/tasks/${taskId}/move`, { targetColumnId, targetPosition }).then(text),
      ),
  );

  server.registerTool(
    'delete_task',
    {
      description: 'Delete a task. Requires a read_write API key.',
      inputSchema: { taskId: z.string() },
    },
    async ({ taskId }) =>
      guard(() => client.delete(`/api/v1/tasks/${taskId}`).then(() => text({ deleted: taskId }))),
  );

  // ── Teams / clients / secrets ────────────────────────────────────────────────
  server.registerTool('list_teams', { description: 'List all teams.', inputSchema: {} }, async () =>
    guard(() => client.get('/api/v1/teams').then(text)),
  );
  server.registerTool(
    'create_team',
    {
      description: 'Create a team. Requires a read_write API key.',
      inputSchema: { name: z.string(), description: z.string().optional() },
    },
    async (args) => guard(() => client.post('/api/v1/teams', compact(args)).then(text)),
  );

  server.registerTool(
    'list_clients',
    { description: 'List all clients.', inputSchema: {} },
    async () => guard(() => client.get('/api/v1/clients').then(text)),
  );
  server.registerTool(
    'create_client',
    {
      description: 'Create a client. Requires a read_write API key.',
      inputSchema: {
        name: z.string(),
        company: z.string().optional(),
        email: z.string().optional(),
        color: z.string().optional(),
      },
    },
    async (args) => guard(() => client.post('/api/v1/clients', compact(args)).then(text)),
  );

  server.registerTool(
    'list_secrets',
    {
      description:
        "List a board's secrets — METADATA ONLY. Credential values are never returned by the API.",
      inputSchema: { boardId: z.string() },
    },
    async ({ boardId }) => guard(() => client.get(`/api/v1/boards/${boardId}/secrets`).then(text)),
  );

  // ── Agent-friendly composites ────────────────────────────────────────────────
  server.registerTool(
    'search_tasks',
    {
      description:
        'Search tasks on a board by text and/or priority (client-side filter over list_tasks).',
      inputSchema: {
        boardId: z.string(),
        query: z.string().optional(),
        priority: priority.optional(),
      },
    },
    async ({ boardId, query, priority: p }) =>
      guard(async () => {
        const { items } = await client.get<{ items: Record<string, unknown>[] }>(
          `/api/v1/boards/${boardId}/tasks`,
        );
        const q = query?.toLowerCase();
        const filtered = items.filter((t) => {
          const matchesText =
            !q ||
            String(t['title'] ?? '')
              .toLowerCase()
              .includes(q) ||
            String(t['description'] ?? '')
              .toLowerCase()
              .includes(q);
          const matchesPriority = !p || t['priority'] === p;
          return matchesText && matchesPriority;
        });
        return text({ total: filtered.length, items: filtered });
      }),
  );

  server.registerTool(
    'summarize_board',
    {
      description: 'Return a compact summary of a board: column names with task counts and titles.',
      inputSchema: { boardId: z.string() },
    },
    async ({ boardId }) =>
      guard(async () => {
        const [board, cols, tasks] = await Promise.all([
          client.get<{ title: string }>(`/api/v1/boards/${boardId}`),
          client.get<{ items: { id: string; title: string; position: number }[] }>(
            `/api/v1/boards/${boardId}/columns`,
          ),
          client.get<{ items: { columnId: string; title: string; priority: string }[] }>(
            `/api/v1/boards/${boardId}/tasks`,
          ),
        ]);
        const columns = [...cols.items]
          .sort((a, b) => a.position - b.position)
          .map((c) => {
            const columnTasks = tasks.items.filter((t) => t.columnId === c.id);
            return {
              column: c.title,
              count: columnTasks.length,
              tasks: columnTasks.map((t) => t.title),
            };
          });
        return text({ board: board.title, totalTasks: tasks.items.length, columns });
      }),
  );
}
