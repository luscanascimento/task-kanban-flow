# Task Kanban Flow — API Consumer Guide

The public REST API lets external clients read and (with the right scope) mutate
kanban data. It is served by `apps/api` (Fastify + SQLite) and authenticated with
**API keys**.

- **Base URL (dev):** `http://localhost:3000`
- **Version prefix:** `/api/v1`
- **Interactive docs (OpenAPI):** `http://localhost:3000/docs`

---

## 1. Run the API locally

```bash
pnpm --filter @tkf/api dev      # starts on http://localhost:3000, seeds demo data
```

On first run it seeds a demo dataset and three users (all password `password123`):

| Email               | Role    |
| ------------------- | ------- |
| `demo@example.com`  | admin   |
| `ana@example.com`   | member  |
| `bruno@example.com` | manager |

> For anything beyond local dev, set real secrets in `apps/api/.env` (see
> `.env.example`). Without them the server generates **ephemeral** dev secrets
> and logs a warning — data hashed/encrypted with those will not survive a
> restart.

---

## 2. Get an API key

API keys are created by a signed-in user. Two ways:

**A. From the web app** — sign in and go to **Settings → API Keys**, click
**Create key**, choose a scope, and copy the key. It is shown **once**.

**B. Via the API** — log in for an access token, then create a key:

```bash
# 1) Log in
ACCESS=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password123"}' \
  | jq -r .tokens.accessToken)

# 2) Create a read_write key (use "read" for a read-only key)
curl -s -X POST http://localhost:3000/api/v1/keys \
  -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"name":"my integration","scope":"read_write"}'
# → { "id": "...", "name": "...", "display": "tkf_9f3ab21c", "scope": "read_write", "key": "tkf_…" }
```

The `key` field is the **only** time the plaintext is returned. Store it
securely; the server keeps only a hash.

---

## 3. Authenticate requests

Send the key as a Bearer token:

```bash
curl http://localhost:3000/api/v1/boards \
  -H "Authorization: Bearer tkf_your_key_here"
```

**Scopes**

| Scope        | Can do                              |
| ------------ | ----------------------------------- |
| `read`       | `GET` only                          |
| `read_write` | `GET` + `POST` / `PATCH` / `DELETE` |

A `read` key hitting a write route gets `403 forbidden`. A revoked or unknown
key gets `401 invalid_api_key`. Revoking a key is a soft delete (`deleted_at`);
it stops working immediately.

**Rate limits** — 300 requests/minute/IP by default (10/min on auth routes).
Exceeding it returns `429 rate_limited` with a `retry-after` hint.

---

## 4. Endpoint reference

All routes are under `/api/v1`. Collections return `{ "items": [...] }`.

### Boards

| Method   | Path               | Scope      | Body                                                      |
| -------- | ------------------ | ---------- | --------------------------------------------------------- |
| `GET`    | `/boards?teamId=`  | read       | —                                                         |
| `GET`    | `/boards/:boardId` | read       | —                                                         |
| `POST`   | `/boards`          | read_write | `{ teamId, title, description?, visibility?, clientId? }` |
| `PATCH`  | `/boards/:boardId` | read_write | `{ title?, description?, visibility?, clientId? }`        |
| `DELETE` | `/boards/:boardId` | read_write | —                                                         |

### Columns

| Method | Path                               | Scope      | Body                          |
| ------ | ---------------------------------- | ---------- | ----------------------------- |
| `GET`  | `/boards/:boardId/columns`         | read       | —                             |
| `POST` | `/boards/:boardId/columns`         | read_write | `{ title, position, color? }` |
| `POST` | `/boards/:boardId/columns/reorder` | read_write | `{ orderedIds: string[] }`    |

### Tasks

| Method   | Path                                   | Scope      | Body                                                                    |
| -------- | -------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `GET`    | `/boards/:boardId/tasks`               | read       | —                                                                       |
| `GET`    | `/tasks/:id`                           | read       | —                                                                       |
| `POST`   | `/boards/:boardId/tasks`               | read_write | `{ columnId, title, priority?, assigneeId?, dueDate?, clientId? }`      |
| `PATCH`  | `/tasks/:id`                           | read_write | `{ title?, description?, priority?, status?, columnId?, position?, … }` |
| `POST`   | `/tasks/:id/move`                      | read_write | `{ targetColumnId, targetPosition }`                                    |
| `POST`   | `/tasks/:id/attachments`               | read_write | `{ name, mimeType, url, sizeBytes }`                                    |
| `DELETE` | `/tasks/:id/attachments/:attachmentId` | read_write | —                                                                       |
| `DELETE` | `/tasks/:id`                           | read_write | —                                                                       |

### Teams, Clients, Secrets

| Method | Path                       | Scope      | Notes                                      |
| ------ | -------------------------- | ---------- | ------------------------------------------ |
| `GET`  | `/teams`, `/teams/:id`     | read       | includes members                           |
| `POST` | `/teams`                   | read_write | `{ name, description? }`                   |
| `POST` | `/teams/:id/members`       | read_write | `{ email, role }`                          |
| `GET`  | `/clients`, `/clients/:id` | read       | —                                          |
| `POST` | `/clients`                 | read_write | `{ name, company?, email?, color? }`       |
| `GET`  | `/boards/:boardId/secrets` | read       | **metadata only — no values**              |
| `POST` | `/boards/:boardId/secrets` | read_write | `{ platform, label, authType, secret, … }` |

### Key management (user session, not API key)

| Method   | Path        | Auth       |
| -------- | ----------- | ---------- |
| `GET`    | `/keys`     | Bearer JWT |
| `POST`   | `/keys`     | Bearer JWT |
| `DELETE` | `/keys/:id` | Bearer JWT |

> **Secrets never expose values.** The vault stores each secret AES-256-GCM
> encrypted at rest. Read endpoints return metadata (`platform`, `label`,
> `authType`, `hasValue: true`) but never the credential itself.

---

## 5. Errors

Every error is a consistent JSON shape:

```json
{
  "statusCode": 403,
  "code": "forbidden",
  "message": "This API key is read-only; a read_write key is required",
  "timestamp": "2026-07-17T18:00:00.000Z",
  "path": "/api/v1/teams"
}
```

| Status | `code`             | Meaning                              |
| ------ | ------------------ | ------------------------------------ |
| 400    | `validation_error` | Body/params failed schema validation |
| 401    | `invalid_api_key`  | Missing, unknown, or revoked key     |
| 403    | `forbidden`        | Read key attempted a write           |
| 404    | `not_found`        | Resource does not exist              |
| 429    | `rate_limited`     | Too many requests                    |

Input is validated and sanitised server-side (unknown fields are stripped,
types/lengths enforced), and all database access uses parameterized statements,
so malformed or malicious payloads are rejected rather than executed.

---

## 6. Worked example: create a task

```bash
KEY=tkf_your_read_write_key

# find a board and its first column
BOARD=$(curl -s $BASE/api/v1/boards -H "Authorization: Bearer $KEY" | jq -r .items[0].id)
COL=$(curl -s $BASE/api/v1/boards/$BOARD/columns -H "Authorization: Bearer $KEY" | jq -r .items[0].id)

# create the task
curl -s -X POST $BASE/api/v1/boards/$BOARD/tasks \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d "{\"columnId\":\"$COL\",\"title\":\"Follow up with client\",\"priority\":\"high\"}"
```

For a machine-readable contract, see the OpenAPI document at `/docs`.
