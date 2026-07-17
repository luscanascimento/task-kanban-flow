# Task Kanban Flow — MCP Server Guide

`apps/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server
that lets an AI agent (Claude Desktop, Claude Code, or any MCP client) read and
drive the kanban. It talks to the public REST API using an API key, so the same
scope and security rules apply to the agent as to any other client.

```
Claude / MCP client ──stdio──▶ tkf-mcp ──HTTPS + API key──▶ apps/api ──▶ SQLite
```

---

## 1. Prerequisites

1. The API running (see `docs/api-guide.md`):
   ```bash
   pnpm --filter @tkf/api dev        # http://localhost:3000
   ```
2. An API key. Use a **`read_write`** key if you want the agent to create/move
   tasks; a `read` key limits it to queries. Create one in the app under
   **Settings → API Keys**, or via the API.

Build the server once:

```bash
pnpm --filter @tkf/mcp build          # outputs apps/mcp/dist/main.js
```

---

## 2. Configure your MCP client

The server reads two environment variables:

| Variable      | Default                 | Notes                                   |
| ------------- | ----------------------- | --------------------------------------- |
| `TKF_API_URL` | `http://localhost:3000` | Base URL of the API                     |
| `TKF_API_KEY` | _(required)_            | `tkf_…` key; `read_write` for mutations |

### Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "task-kanban-flow": {
      "command": "node",
      "args": ["/absolute/path/to/task-kanban-flow/apps/mcp/dist/main.js"],
      "env": {
        "TKF_API_URL": "http://localhost:3000",
        "TKF_API_KEY": "tkf_your_read_write_key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add task-kanban-flow \
  --env TKF_API_URL=http://localhost:3000 \
  --env TKF_API_KEY=tkf_your_read_write_key \
  -- node /absolute/path/to/task-kanban-flow/apps/mcp/dist/main.js
```

During development you can point the command at the source with
`tsx apps/mcp/src/main.ts` instead of the built file.

---

## 3. Tools

21 tools are exposed. Mutating tools require a `read_write` key.

| Group     | Tools                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| Boards    | `list_boards`, `get_board`, `create_board`, `update_board`, `delete_board`         |
| Columns   | `list_columns`, `create_column`, `reorder_columns`                                 |
| Tasks     | `list_tasks`, `get_task`, `create_task`, `update_task`, `move_task`, `delete_task` |
| Teams     | `list_teams`, `create_team`                                                        |
| Clients   | `list_clients`, `create_client`                                                    |
| Secrets   | `list_secrets` _(metadata only — never returns credential values)_                 |
| Composite | `search_tasks` (text + priority filter), `summarize_board` (columns + counts)      |

---

## 4. Example agent prompts

Once connected, ask the agent things like:

- _"Summarize the Product Roadmap board."_ → `summarize_board`
- _"Create a task 'Prepare Q3 report' in the Backlog column of the Product Roadmap board, high priority."_ → `list_boards` → `list_columns` → `create_task`
- _"Move everything that's done to the Done column."_ → `list_tasks` → `move_task` (repeated)
- _"Which urgent tasks are open?"_ → `search_tasks` with `priority: "urgent"`

The agent chains the read tools to discover ids, then calls the write tools.

---

## 5. Security notes

- The agent can only do what the key's **scope** allows. Hand it a `read` key
  to make it strictly observational.
- **Secrets** are never exposed: `list_secrets` returns metadata only; there is
  no tool (and no API endpoint) that returns a credential value.
- Revoke the key (Settings → API Keys, or `DELETE /api/v1/keys/:id`) to cut the
  agent off instantly — revocation is enforced on the very next request.
- Prefer a **dedicated** key per agent so you can revoke it without affecting
  other integrations, and rotate it periodically.
