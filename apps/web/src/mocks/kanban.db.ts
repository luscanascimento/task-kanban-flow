import type {
  BoardDto,
  ClientDto,
  ColumnDto,
  ProjectSecretDto,
  TaskDto,
  TeamDto,
  UserDto,
} from '@tkf/shared-types';

/**
 * In-memory kanban "database" for the MSW mock backend. State is mutable and
 * lives for the lifetime of the browser tab, so CRUD and drag-drop operations
 * persist across navigation during a demo/dev session (and reset on reload).
 *
 * Model: Team → Boards → Columns → Tasks. Clients are global and can be
 * attached to boards/tasks. Secrets (client accounts) are scoped to a board.
 */

let seq = 0;
const id = (prefix: string): string => `${prefix}_${(++seq).toString(36).padStart(4, '0')}`;
const now = (): string => new Date().toISOString();
const daysFromNow = (d: number): string => new Date(Date.now() + d * 86_400_000).toISOString();

// A tiny inline SVG "screenshot" used to seed a card attachment (a print).
const SAMPLE_PRINT =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#0ea5e9"/><rect x="16" y="16" width="288" height="40" rx="6" fill="#ffffff" opacity="0.9"/><rect x="16" y="72" width="180" height="14" rx="4" fill="#ffffff" opacity="0.7"/><rect x="16" y="96" width="220" height="14" rx="4" fill="#ffffff" opacity="0.5"/><text x="24" y="42" font-family="sans-serif" font-size="16" fill="#0f172a">Dashboard preview</text></svg>`,
  );

const users: UserDto[] = [
  {
    id: 'usr_001',
    email: 'demo@example.com',
    displayName: 'Demo User',
    role: 'member',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'usr_002',
    email: 'ana@example.com',
    displayName: 'Ana Souza',
    role: 'member',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'usr_003',
    email: 'bruno@example.com',
    displayName: 'Bruno Lima',
    role: 'admin',
    createdAt: now(),
    updatedAt: now(),
  },
];

const userById = (uid: string): UserDto | undefined => users.find((u) => u.id === uid);
const userByEmail = (email: string): UserDto | undefined =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase());

interface Db {
  teams: TeamDto[];
  boards: BoardDto[];
  columns: ColumnDto[];
  tasks: TaskDto[];
  clients: ClientDto[];
  secrets: ProjectSecretDto[];
}

function seed(): Db {
  // --- Clients -------------------------------------------------------------
  const clients: ClientDto[] = [
    {
      id: 'cli_acme',
      name: 'Acme Corp',
      company: 'Acme Corporation',
      email: 'ops@acme.com',
      color: '#0ea5e9',
      notes: 'Primary SaaS account.',
      boardCount: 0,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'cli_globex',
      name: 'Globex',
      company: 'Globex Ltda',
      email: 'contato@globex.com',
      color: '#8b5cf6',
      boardCount: 0,
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  // --- Teams ---------------------------------------------------------------
  const teams: TeamDto[] = [
    {
      id: 'team_eng',
      name: 'Engineering',
      description: 'Product engineering squad.',
      ownerId: 'usr_003',
      members: [
        { user: userById('usr_003')!, role: 'owner', joinedAt: now() },
        { user: userById('usr_001')!, role: 'admin', joinedAt: now() },
        { user: userById('usr_002')!, role: 'member', joinedAt: now() },
      ],
      boardCount: 0,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'team_growth',
      name: 'Growth Marketing',
      description: 'Campaigns, ads and web.',
      ownerId: 'usr_001',
      members: [
        { user: userById('usr_001')!, role: 'owner', joinedAt: now() },
        { user: userById('usr_002')!, role: 'member', joinedAt: now() },
      ],
      boardCount: 0,
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  // --- Board: Product Roadmap (team_eng, client acme) ----------------------
  const roadmapId = 'brd_roadmap';
  const cols: ColumnDto[] = [
    {
      id: 'col_backlog',
      boardId: roadmapId,
      title: 'Backlog',
      position: 0,
      color: '#64748b',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_todo',
      boardId: roadmapId,
      title: 'To Do',
      position: 1,
      color: '#0ea5e9',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_doing',
      boardId: roadmapId,
      title: 'In Progress',
      position: 2,
      color: '#f59e0b',
      wipLimit: 3,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_review',
      boardId: roadmapId,
      title: 'Review',
      position: 3,
      color: '#8b5cf6',
      wipLimit: 2,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_done',
      boardId: roadmapId,
      title: 'Done',
      position: 4,
      color: '#22c55e',
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const mk = (
    partial: Pick<TaskDto, 'boardId' | 'columnId' | 'title' | 'priority' | 'status' | 'position'> &
      Partial<TaskDto>,
  ): TaskDto => ({
    id: id('tsk'),
    description: '',
    labels: [],
    checklistItems: [],
    attachments: [],
    commentCount: 0,
    attachmentCount: 0,
    createdAt: now(),
    updatedAt: now(),
    ...partial,
  });

  const label = (name: string, color: string) => ({ id: id('lbl'), name, color });

  const tasks: TaskDto[] = [
    mk({
      boardId: roadmapId,
      columnId: 'col_backlog',
      title: 'Research competitor onboarding flows',
      priority: 'low',
      status: 'backlog',
      position: 0,
      labels: [label('research', '#0ea5e9')],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_backlog',
      title: 'Define analytics event taxonomy',
      priority: 'medium',
      status: 'backlog',
      position: 1,
      assigneeId: 'usr_002',
      assignee: userById('usr_002')!,
      labels: [label('analytics', '#8b5cf6')],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_todo',
      title: 'Design empty states for boards list',
      priority: 'medium',
      status: 'backlog',
      position: 0,
      dueDate: daysFromNow(5),
      assigneeId: 'usr_001',
      assignee: userById('usr_001')!,
      labels: [label('design', '#ec4899')],
      checklistItems: [
        { id: id('chk'), text: 'No boards state', checked: true, position: 0 },
        { id: id('chk'), text: 'No tasks state', checked: false, position: 1 },
        { id: id('chk'), text: 'Error state', checked: false, position: 2 },
      ],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_todo',
      title: 'Add keyboard shortcuts for card actions',
      priority: 'low',
      status: 'backlog',
      position: 1,
      labels: [label('a11y', '#22c55e')],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_doing',
      title: 'Implement drag-and-drop between columns',
      priority: 'high',
      status: 'in_progress',
      position: 0,
      dueDate: daysFromNow(2),
      assigneeId: 'usr_001',
      assignee: userById('usr_001')!,
      labels: [label('frontend', '#0ea5e9'), label('core', '#f59e0b')],
      commentCount: 3,
      attachmentCount: 1,
      attachments: [
        {
          id: id('att'),
          name: 'dashboard-preview.svg',
          mimeType: 'image/svg+xml',
          url: SAMPLE_PRINT,
          sizeBytes: 620,
          createdAt: now(),
        },
      ],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_doing',
      title: 'Wire optimistic updates in board store',
      priority: 'urgent',
      status: 'in_progress',
      position: 1,
      dueDate: daysFromNow(-1),
      assigneeId: 'usr_003',
      assignee: userById('usr_003')!,
      labels: [label('frontend', '#0ea5e9')],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_review',
      title: 'Auth refresh-on-401 interceptor',
      priority: 'high',
      status: 'in_progress',
      position: 0,
      assigneeId: 'usr_003',
      assignee: userById('usr_003')!,
      labels: [label('security', '#ef4444')],
      commentCount: 1,
      attachmentCount: 2,
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_done',
      title: 'Set up design tokens pipeline',
      priority: 'medium',
      status: 'done',
      position: 0,
      assigneeId: 'usr_002',
      assignee: userById('usr_002')!,
      labels: [label('design-system', '#8b5cf6')],
    }),
    mk({
      boardId: roadmapId,
      columnId: 'col_done',
      title: 'Fix ng serve in pnpm monorepo',
      priority: 'high',
      status: 'done',
      position: 1,
      labels: [label('devex', '#22c55e')],
    }),
  ];

  // --- Board: Website Revamp (team_growth, client globex) ------------------
  const webId = 'brd_website';
  cols.push(
    {
      id: 'col_web_todo',
      boardId: webId,
      title: 'To Do',
      position: 0,
      color: '#0ea5e9',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_web_doing',
      boardId: webId,
      title: 'In Progress',
      position: 1,
      color: '#f59e0b',
      wipLimit: 2,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'col_web_done',
      boardId: webId,
      title: 'Done',
      position: 2,
      color: '#22c55e',
      createdAt: now(),
      updatedAt: now(),
    },
  );
  tasks.push(
    mk({
      boardId: webId,
      columnId: 'col_web_todo',
      title: 'Rewrite hero copy',
      priority: 'medium',
      status: 'backlog',
      position: 0,
      clientId: 'cli_globex',
    }),
    mk({
      boardId: webId,
      columnId: 'col_web_todo',
      title: 'Optimize LCP on landing',
      priority: 'high',
      status: 'backlog',
      position: 1,
      clientId: 'cli_globex',
      labels: [label('perf', '#f59e0b')],
    }),
    mk({
      boardId: webId,
      columnId: 'col_web_doing',
      title: 'Migrate blog to CMS',
      priority: 'medium',
      status: 'in_progress',
      position: 0,
      assigneeId: 'usr_002',
      assignee: userById('usr_002')!,
      clientId: 'cli_globex',
    }),
  );

  // --- Boards --------------------------------------------------------------
  const boards: BoardDto[] = [
    {
      id: roadmapId,
      teamId: 'team_eng',
      title: 'Product Roadmap',
      description: 'Cross-functional delivery board for the Q3 product roadmap.',
      visibility: 'workspace',
      ownerId: 'usr_003',
      clientId: 'cli_acme',
      members: [
        { user: userById('usr_003')!, role: 'admin', joinedAt: now() },
        { user: userById('usr_001')!, role: 'editor', joinedAt: now() },
        { user: userById('usr_002')!, role: 'editor', joinedAt: now() },
      ],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'brd_personal',
      teamId: 'team_growth',
      title: 'Campaign Planning',
      description: 'Q3 growth campaigns and experiments.',
      visibility: 'private',
      ownerId: 'usr_001',
      members: [{ user: userById('usr_001')!, role: 'admin', joinedAt: now() }],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: webId,
      teamId: 'team_growth',
      title: 'Website Revamp',
      description: 'Marketing site redesign for Globex.',
      visibility: 'workspace',
      ownerId: 'usr_001',
      clientId: 'cli_globex',
      members: [
        { user: userById('usr_001')!, role: 'admin', joinedAt: now() },
        { user: userById('usr_002')!, role: 'editor', joinedAt: now() },
      ],
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  // --- Secrets (client accounts used on the roadmap project) ---------------
  const secrets: ProjectSecretDto[] = [
    {
      id: 'sec_aws',
      boardId: roadmapId,
      clientId: 'cli_acme',
      platform: 'AWS',
      label: 'Production root',
      authType: 'api_key',
      username: 'AKIAEXAMPLE1234',
      secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      url: 'https://console.aws.amazon.com',
      notes: 'Rotate quarterly.',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'sec_gads',
      boardId: roadmapId,
      clientId: 'cli_acme',
      platform: 'Google Ads',
      label: 'Ads manager',
      authType: 'oauth',
      username: 'ads@acme.com',
      secret: 'ya29.a0ExampleOAuthRefreshTokenValue',
      url: 'https://ads.google.com',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'sec_cf',
      boardId: roadmapId,
      clientId: 'cli_acme',
      platform: 'Cloudflare',
      label: 'DNS + WAF',
      authType: 'access_token',
      secret: 'cf_ExampleAccessTokenValue_9f3a',
      url: 'https://dash.cloudflare.com',
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  return { teams, boards, columns: cols, tasks, clients, secrets };
}

export const db: Db = seed();

// ---------------------------------------------------------------------------
// Helpers used by the handlers
// ---------------------------------------------------------------------------

export const kanban = {
  newId: id,
  timestamp: now,
  users: (): UserDto[] => users,
  userById,
  userByEmail,

  /** Boards belonging to a team, newest first is not needed — keep insertion order. */
  boardsForTeam: (teamId: string): BoardDto[] => db.boards.filter((b) => b.teamId === teamId),

  /** Attach server-computed counts to a team before returning it. */
  withTeamCounts: (team: TeamDto): TeamDto => ({
    ...team,
    boardCount: db.boards.filter((b) => b.teamId === team.id).length,
  }),

  withClientCounts: (client: ClientDto): ClientDto => ({
    ...client,
    boardCount: db.boards.filter((b) => b.clientId === client.id).length,
  }),

  defaultColumnsFor(boardId: string): ColumnDto[] {
    const titles = ['Backlog', 'In Progress', 'Done'];
    const colors = ['#64748b', '#f59e0b', '#22c55e'];
    return titles.map((title, i) => ({
      id: id('col'),
      boardId,
      title,
      position: i,
      color: colors[i] ?? '#64748b',
      createdAt: now(),
      updatedAt: now(),
    }));
  },

  /** Re-densify positions (0..n-1) for the tasks of a single column. */
  reindexColumn(columnId: string): void {
    db.tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.position - b.position)
      .forEach((t, i) => {
        const idx = db.tasks.findIndex((x) => x.id === t.id);
        if (idx >= 0) db.tasks[idx] = { ...t, position: i };
      });
  },
};
