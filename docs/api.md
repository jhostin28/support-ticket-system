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

## Status codes used

| Code | Meaning here |
|---|---|
| `200` | Request succeeded |
| `201` | Request succeeded and something new exists |
| `400` | The request itself is wrong — missing or invalid data |
| `401` | Not identified: no token, bad token, or bad credentials |
| `409` | The request is valid but clashes with existing data |
| `500` | Something unexpected broke. Detail goes to the server log only |