# Phase 2 — Clients and tickets

**Status:** done

The CRUD core. Tickets can be created, listed, filtered, fetched and updated,
with the business rules that make it a support system rather than a generic
table editor.

## What was built

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/clients` | yes | List active clients |
| `POST /api/clients` | yes | Register a client |
| `GET /api/tickets` | yes | List tickets, optionally filtered |
| `GET /api/tickets/:id` | yes | Fetch one ticket |
| `POST /api/tickets` | yes | Create a ticket |
| `PATCH /api/tickets/:id` | yes | Update a ticket |

Plus a new column (`author_id`) and the first database trigger.

## Decisions

### `author_id` and `user_id` are separate columns

This was open from phase 0 and got settled here.

`author_id` is the agent who opened the ticket and never changes. `user_id` is
who holds it now. They start equal — the agent who takes the call keeps the
case — and diverge when a ticket is reassigned.

One column could not answer both questions. A dropped call leaves `user_id`
NULL, and the next agent to take the case claims it; without `author_id` the
record of who opened it would be gone.

### The client never sets identity or ownership

`author_id`, `user_id` and `department_id` come from `req.user`, never from the
request body. If the client supplied them, anyone could open a ticket in
another agent's name, or drop one straight into Billing's queue without
working it first.

The department is looked up from the database rather than read from the token.
Moving an agent from Tier 1 to Billing should take effect on their next ticket,
not when their token expires up to 24 hours later. **The rule: what is stable
goes in the token, what changes gets looked up.**

### Reassignment is a claim, not an assignment

`PATCH` does not accept a `user_id`. It accepts `{ "claim": true }`, which
assigns the ticket to whoever is making the request.

The real scenario is a dropped call: the client rings back, a different agent
picks up, and that agent takes over the case. Handing it to a third party is a
supervisor action and waits for role permissions in phase 4.

### Timestamps follow the status, set by the server

Changing status to `resolving` sets `resolved_at`; `closed` sets `closed_at`.
Neither is accepted from the client — an agent could otherwise mark a ticket
resolved with last week's date and the resolution-time numbers would be
fiction.

Both are only set once. A ticket that goes back to `in_progress` and is
resolved again keeps its first resolution time.

### A closed ticket cannot be modified

Enforced in the controller, not the database, because the rule depends on the
ticket's **previous** state and a CHECK constraint cannot see it. Returns
`409`: the request is well formed but conflicts with the current state.

### Escalation is not part of PATCH

`department_id` is deliberately not updatable here. Escalating has to change
the department **and** record who moved it and from where, both or neither.
That needs its own endpoint and a transaction — phase 3.

Allowing it through PATCH would let someone move a ticket with no trace.

### `updated_at` is handled by a trigger, not the backend

`DEFAULT NOW()` only fires on INSERT, so the column would have kept the
creation time forever.

Doing it in the backend would mean every future UPDATE has to remember to set
it, and an update run straight from pgAdmin would skip it entirely. In the
database it cannot be bypassed.

Same reasoning as hashing inside the service and using an ENUM over VARCHAR:
**what is critical goes where it cannot be forgotten.**

### Dynamic SQL, static column names

Both the filtered list and the PATCH build their SQL piece by piece, because
the fields are optional.

What varies is the *shape* of the query. Values always travel through the
parameter array, never concatenated. Column names are interpolated, which is
why they come from the controller's own code and never from the request body —
letting a client name a column would be an injection hole.

## Error codes added

| Code | Meaning | Response |
|---|---|---|
| `22P02` | Invalid input for a type — a status outside the ENUM, a non-numeric id | `400` |

## Still open

- No role-based permissions. An agent can do everything a supervisor can.
  Phase 4.
- No `GET /api/clients/:id`, no update or deactivate for clients.
- Comments and escalation endpoints. Phase 3.
- No tests. Phase 5.
- No pagination on `GET /api/tickets`. Fine at this size; it will not be at
  ten thousand tickets, and phase 6 is where that shows up.