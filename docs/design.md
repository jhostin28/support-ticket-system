# Data Model Design

This document describes the database schema for the support ticket system and,
more importantly, **why** each decision was made. It is the reference for Phase 1
and the basis for explaining the project in a technical interview.

Database: **PostgreSQL**

---

## Custom types

PostgreSQL ships with built-in data types (`INTEGER`, `VARCHAR`, `TEXT`,
`BOOLEAN`, `TIMESTAMPTZ`). `CREATE TYPE` defines new ones that exist only in this
database.

```sql
CREATE TYPE ticket_status   AS ENUM ('pending', 'in_progress', 'resolving', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE user_role       AS ENUM ('agent', 'supervisor');
```

**Why `ENUM` instead of a lookup table for status?**
The backend has logic tied to each status (for example, a closed ticket cannot be
reopened). A status added from an admin screen would have no logic behind it, so
adding one requires a developer anyway. The status list is also small and stable.

**Trade-off:** the status list becomes part of the schema. Changing it requires a
migration, and PostgreSQL does not allow removing a value from an `ENUM` directly.
A lookup table would let a supervisor add a status with a simple `INSERT`.

---

## Tables

### `tickets`

The support case itself.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `title` | `VARCHAR(200)` | | NOT NULL | |
| `description` | `TEXT` | | NOT NULL | |
| `status` | `ticket_status` | | NOT NULL | `'pending'` |
| `priority` | `ticket_priority` | | NOT NULL | `'medium'` |
| `created_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |
| `resolved_at` | `TIMESTAMPTZ` | | NULL | |
| `closed_at` | `TIMESTAMPTZ` | | NULL | |
| `client_id` | `INTEGER` | FK → `clients` | NOT NULL | |
| `user_id` | `INTEGER` | FK → `users` | NULL | |
| `department_id` | `INTEGER` | FK → `departments` | NOT NULL | |

**`title` is `VARCHAR(200)`, `description` is `TEXT`.** A title has a real business
reason to stay short: it has to fit in a queue list. A description does not, and
any character limit would eventually reject a long case for no business reason.
Rule of thumb: if the limit cannot be justified, use `TEXT`.

**`client_id` is NOT NULL but `user_id` is NULL.** A ticket cannot exist without
someone who reported it, but it can exist without an assigned agent. This is the
callback case: the call ended unresolved, the ticket is waiting for someone to
pick it up, and nobody owns it yet.

**`department_id` is NOT NULL.** A ticket is always in some queue, at minimum
Tier 1. A ticket in no department would be invisible to everyone, which in
support means a forgotten customer.

**Four timestamps, not one.** `created_at` and `updated_at` are never empty:
creating the ticket counts as the first update. `resolved_at` and `closed_at`
are `NULL` until those events happen. `resolved_at` and `closed_at` are separate
because a ticket can be solved and still stay open while waiting for customer
confirmation — which also allows measuring resolution time and closing time
separately.

**`priority` drives behavior.** The agent queue is ordered by priority first, then
by creation date, so high-priority tickets are handled first without starving
older low-priority ones:

```sql
ORDER BY priority DESC, created_at ASC;
```

---

### `clients`

The person who reports the problem.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `name` | `VARCHAR(100)` | | NOT NULL | |
| `phone` | `VARCHAR(20)` | | NOT NULL | |
| `email` | `VARCHAR(100)` | UNIQUE | NULL | |
| `is_active` | `BOOLEAN` | | NOT NULL | `true` |
| `created_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |

**`phone` is `VARCHAR`, not `INTEGER`.** Phone numbers are never used in
arithmetic, they can contain `+`, spaces and dashes, and a leading zero would be
stripped by a numeric type. If it is not used for math, it is not a number.

**`email` is UNIQUE but nullable.** Two clients sharing an email almost always
means a duplicate record. Not every caller has an email address, and requiring
one would lock those customers out of the system. `UNIQUE` allows many `NULL`
rows, since `NULL` is the absence of a value rather than a value.

**`phone` is not UNIQUE.** A household or a small office legitimately shares one
number.

**Soft delete instead of `DELETE`.** Clients are never removed; `is_active` is set
to `false`. Former customers call back, and their case history is also the record
of what agents did and how long it took. The cost is that every query listing
active clients must filter on `is_active`.

---

### `users`

Agents and supervisors who work in the system.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `name` | `VARCHAR(100)` | | NOT NULL | |
| `email` | `VARCHAR(100)` | UNIQUE | NOT NULL | |
| `password_hash` | `VARCHAR(255)` | | NOT NULL | |
| `role` | `user_role` | | NOT NULL | `'agent'` |
| `department_id` | `INTEGER` | FK → `departments` | NOT NULL | |
| `is_active` | `BOOLEAN` | | NOT NULL | `true` |
| `created_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |

**`email` is NOT NULL and UNIQUE.** Unlike clients, users log in with it. Two
users with the same email would make login ambiguous.

**`password_hash`, never `password`.** Passwords are hashed with bcrypt before
reaching the database; hashing happens in the backend, not in PostgreSQL. A hash
is one-way: the original password cannot be recovered from it. Login works by
hashing the submitted password and comparing hashes. This is why the system can
only *reset* a forgotten password, never send it — it does not know it. The
column name makes that explicit to anyone reading the schema. `VARCHAR(255)`
leaves room beyond bcrypt's 60 characters in case the algorithm changes.

---

### `departments`

The queues a ticket can be escalated to.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `name` | `VARCHAR(50)` | UNIQUE | NOT NULL | |

**`name` is UNIQUE.** Two departments called "Billing" would make escalation
ambiguous.

---

### `comments`

Notes added to a case over time.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `body` | `TEXT` | | NOT NULL | |
| `created_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |
| `ticket_id` | `INTEGER` | FK → `tickets` | NOT NULL | |
| `user_id` | `INTEGER` | FK → `users` | NOT NULL | |

**`user_id` is NOT NULL here, unlike in `tickets`.** The same column name means
different things in each table. In `tickets` it answers "who is assigned to this
case?" and can be empty. Here it answers "who wrote this note?" — a comment
cannot exist without an author. A foreign key is nullable or not based on what it
means in its table, not on its name.

**No `updated_at`.** Case notes are a record of what happened and are not edited.
Adding the column would imply editing is allowed.

---

### `ticket_escalations`

One row per movement of a ticket between departments.

| Column | Type | Key | Null | Default |
|---|---|---|---|---|
| `id` | `INTEGER` | PK | NOT NULL | |
| `ticket_id` | `INTEGER` | FK → `tickets` | NOT NULL | |
| `from_department_id` | `INTEGER` | FK → `departments` | NOT NULL | |
| `to_department_id` | `INTEGER` | FK → `departments` | NOT NULL | |
| `user_id` | `INTEGER` | FK → `users` | NOT NULL | |
| `moved_at` | `TIMESTAMPTZ` | | NOT NULL | `NOW()` |

**Why this table exists.** `tickets.department_id` only holds where a ticket is
*now*. Each escalation overwrites the previous value, so the path is lost. Without
this table the system cannot answer: how many times was this case escalated, how
long did it sit in Tier 1, which department receives the most escalations, or who
escalated it.

**Two foreign keys to the same table.** Both columns point to `departments`, so
the names carry the meaning: `from_` is the origin, `to_` is the destination.

**`from_department_id` is NOT NULL.** A ticket is always in a department from the
moment it is created, so every movement has an origin.

**`moved_at`, not `created_at`.** The column records when the movement happened.
A column name should describe the meaning of the data, not just its type.

---

## Relationships

| Relationship | Type | Where the FK lives |
|---|---|---|
| client → tickets | 1:N | `tickets.client_id` |
| user → tickets (assigned) | 1:N | `tickets.user_id` |
| department → tickets | 1:N | `tickets.department_id` |
| ticket → comments | 1:N | `comments.ticket_id` |
| user → comments | 1:N | `comments.user_id` |
| department → users | 1:N | `users.department_id` |
| ticket → escalations | 1:N | `ticket_escalations.ticket_id` |

In a 1:N relationship the foreign key always goes on the "many" side.

---

## Business rules to enforce (pending)

These are decided but not yet implemented. Where each one lives — database
constraint or backend logic — is still open.

- A closed ticket cannot be reopened.
- `updated_at` must change on every modification. `DEFAULT NOW()` only fires on
  insert, so this needs a database trigger or backend logic.
- Setting a ticket to `resolving` or `closed` should set `resolved_at` /
  `closed_at`.
- Escalating a ticket should update `tickets.department_id` **and** insert a row
  into `ticket_escalations`, as a single transaction.
- Whether comments can be added to a closed ticket.

---

## Open questions

- Should `tickets` record which user *created* the ticket, separate from who is
  currently assigned (`author_id`)?
- `ON DELETE` behavior for each foreign key. Soft delete is the default approach,
  so `RESTRICT` is the likely choice as a safety net against accidental hard
  deletes.
