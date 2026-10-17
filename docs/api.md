# API Reference

Base URL: `http://localhost:3000`

All request and response bodies are JSON. Endpoints marked **Auth** require an
`Authorization: Bearer <token>` header.

---

## Health

### `GET /health`

Liveness check. Touches nothing else, so a 200 means the process is running.

**Response `200`**

```json
{ "status": "ok" }
```

---

## Auth

### `POST /api/auth/login`

Verifies credentials and returns a token valid for 24 hours.

**Body**

```json
{
  "email": "agent@company.com",
  "password": "theirPassword"
}
```

**Response `200`**

```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**Errors**

| Status | When |
|---|---|
| `400` | `email` or `password` missing |
| `401` | Wrong password, or no user with that email |

The `401` message is identical in both cases, on purpose — see
[phase-1.md](phase-1.md).

**Using the token**

Send it on every protected request as a header:

    Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

---

## Departments

### `GET /api/departments`

Lists every department, ordered by id.

**Response `200`**

```json
[
  { "id": 1, "name": "Tier 1" },
  { "id": 2, "name": "Billing" },
  { "id": 3, "name": "Technical Support" }
]
```

### `POST /api/departments` — **Auth**

**Body**

```json
{ "name": "Retention" }
```

**Response `201`**

```json
{ "id": 4, "name": "Retention" }
```

**Errors**

| Status | When |
|---|---|
| `400` | `name` missing |
| `401` | No token, or the token is invalid or expired |
| `409` | A department with that name already exists |

---

## Users

Agents and supervisors. Clients do not have accounts — they call, and an agent
creates the ticket for them.

### `POST /api/users`

The password is sent in plain text over the request and hashed with bcrypt
before it reaches the database. It is never returned in any response.

**Body**

```json
{
  "name": "Ana Gomez",
  "email": "ana@company.com",
  "password": "herPassword",
  "role": "agent",
  "departmentId": 1
}
```

`role` is optional and defaults to `agent`. The only other value is
`supervisor`.

**Response `201`**

```json
{
  "id": 2,
  "name": "Ana Gomez",
  "email": "ana@company.com",
  "role": "agent",
  "department_id": 1,
  "is_active": true,
  "created_at": "2026-09-28T14:22:31.418Z"
}
```

**Errors**

| Status | When |
|---|---|
| `400` | A required field is missing, or `departmentId` does not exist |
| `409` | A user with that email already exists |

---

## Clients

The people who report problems. They have no account and never log in — an
agent registers them and opens tickets on their behalf.

### `GET /api/clients` — **Auth**

Lists active clients only. Deactivated clients are kept in the database but
filtered out here.

**Response `200`**

```json
[
  {
    "id": 1,
    "name": "Ana Gomez",
    "phone": "809-555-0101",
    "email": "ana@gmail.com",
    "is_active": true,
    "created_at": "2026-09-29T03:28:34.020Z"
  }
]
```

### `POST /api/clients` — **Auth**

**Body**

```json
{
  "name": "Ana Gomez",
  "phone": "809-555-0101",
  "email": "ana@gmail.com"
}
```

`email` is optional — not every caller has one, and requiring it would lock
those customers out of the system.

**Response `201`** — the created client, with `is_active` and `created_at`
filled in by the database.

**Errors**

| Status | When |
|---|---|
| `400` | `name` or `phone` missing |
| `401` | No token, or the token is invalid or expired |
| `409` | A client with that email already exists |

---

## Tickets

### `GET /api/tickets` — **Auth**

Lists tickets, ordered by priority (high first) and then by creation date
(oldest first), so an old low-priority ticket is not left behind forever.

**Query parameters** — all optional, combinable:

| Parameter | Example |
|---|---|
| `status` | `?status=pending` |
| `departmentId` | `?departmentId=1` |
| `clientId` | `?clientId=1` |

Example: `GET /api/tickets?status=pending&departmentId=1`

**Response `200`** — an array of tickets. Empty array if nothing matches,
which is an answer rather than an error.

**Errors**

| Status | When |
|---|---|
| `400` | A filter value is invalid — a status outside the ENUM, say |
| `401` | No token, or the token is invalid or expired |

### `GET /api/tickets/:id` — **Auth**

**Response `200`**

```json
{
  "id": 1,
  "title": "Laptop will not power on",
  "description": "Customer reports the laptop does not turn on after an update.",
  "status": "pending",
  "priority": "medium",
  "created_at": "2026-10-13T13:33:06.521Z",
  "updated_at": "2026-10-13T13:33:06.521Z",
  "resolved_at": null,
  "closed_at": null,
  "client_id": 1,
  "user_id": 1,
  "department_id": 1,
  "author_id": 1
}
```

**Errors**

| Status | When |
|---|---|
| `400` | The id is not a number |
| `401` | No token, or the token is invalid or expired |
| `404` | No ticket with that id |

### `POST /api/tickets` — **Auth**

**Body**

```json
{
  "title": "Laptop will not power on",
  "description": "Customer reports the laptop does not turn on after an update.",
  "clientId": 1,
  "priority": "high"
}
```

`priority` is optional and defaults to `medium`. Valid values: `low`,
`medium`, `high`.

Not accepted from the client, and why:

| Field | Where it comes from |
|---|---|
| `status` | Always starts as `pending` |
| `author_id` | The authenticated user — nobody opens a ticket in someone else's name |
| `user_id` | Same: the agent who takes the call keeps the case |
| `department_id` | The agent's current department, looked up at creation time |
| `created_at` / `updated_at` | The database |

**Response `201`** — the created ticket, with every field above filled in.

**Errors**

| Status | When |
|---|---|
| `400` | A required field is missing, `clientId` does not exist, or `priority` is not a valid value |
| `401` | No token, or the token is invalid or expired |

### `PATCH /api/tickets/:id` — **Auth**

Updates only the fields sent. Anything left out stays as it is.

**Body** — every field optional:

```json
{
  "title": "Laptop will not power on after update",
  "description": "Customer already tried removing the battery.",
  "status": "resolving",
  "priority": "high",
  "claim": true
}
```

`claim: true` assigns the ticket to whoever is making the request — the
dropped-call case, where another agent picks up and takes over. There is no
way to assign a ticket to a third party; that is a supervisor action and does
not exist yet.

**Side effects of a status change**, applied by the server:

| New status | Effect |
|---|---|
| `resolving` | Sets `resolved_at`, if not already set |
| `closed` | Sets `closed_at`, if not already set |

`updated_at` is refreshed by a database trigger on every update, whatever the
change.

`department_id` is not updatable here — escalating has its own endpoint below.

**Response `200`** — the updated ticket.

**Errors**

| Status | When |
|---|---|
| `400` | An invalid value for `status`, `priority` or the id |
| `401` | No token, or the token is invalid or expired |
| `404` | No ticket with that id |
| `409` | The ticket is closed, and a closed ticket cannot be modified |

### `POST /api/tickets/:id/escalate` — **Auth**

Moves a ticket to another department and records the move.

A business action rather than CRUD, which is why the URL carries a verb. It
runs in a transaction: the ticket's department changes **and** a row lands in
`ticket_escalations`, or neither happens. A ticket sitting in a department
with no record of how it got there would make the history lie.

**Body**

```json
{ "toDepartmentId": 2 }
```

The department it came from, and who moved it, are taken from the ticket and
the token — not from the request.

**Response `200`** — the updated ticket.

**Errors**

| Status | When |
|---|---|
| `400` | `toDepartmentId` missing, or that department does not exist |
| `401` | No token, or the token is invalid or expired |
| `404` | No ticket with that id |
| `409` | The ticket is closed, or it is already in that department |

---

## Comments

Notes added to a case over time. A nested resource: a comment belongs to a
ticket, so there is no top-level `/api/comments`.

Comments cannot be edited or deleted. They are a record of what happened.

### `GET /api/tickets/:ticketId/comments` — **Auth**

Oldest first — a case history read backwards makes no sense.

**Response `200`**

```json
[
  {
    "id": 1,
    "body": "Customer confirms the problem persists.",
    "created_at": "2026-10-17T04:21:31.339Z",
    "ticket_id": 2,
    "user_id": 1
  }
]
```

**Errors**

| Status | When |
|---|---|
| `400` | The ticket id is not a number |
| `401` | No token, or the token is invalid or expired |
| `404` | No ticket with that id |

### `POST /api/tickets/:ticketId/comments` — **Auth**

**Body**

```json
{ "body": "Customer confirms the problem persists." }
```

The author comes from the token — nobody writes a note in another agent's
name.

**Response `201`** — the created comment.

**Errors**

| Status | When |
|---|---|
| `400` | `body` missing, or the ticket id is not a number |
| `401` | No token, or the token is invalid or expired |
| `404` | No ticket with that id |
| `409` | The ticket is closed, and a closed ticket takes no new comments |

---

## Status codes used

| Code | Meaning here |
|---|---|
| `200` | Request succeeded |
| `201` | Request succeeded and something new exists |
| `400` | The request itself is wrong — missing or invalid data |
| `401` | Not identified: no token, bad token, or bad credentials |
| `404` | The thing being looked up does not exist |
| `409` | The request is valid but clashes with existing data or state |
| `500` | Something unexpected broke. Detail goes to the server log only |