# Phase 3 — Comments and escalation

**Status:** done

Two features that complete the case lifecycle: notes that accumulate on a
ticket, and moving a ticket between departments with a record of who moved it.

## What was built

| Endpoint | Description |
|---|---|
| `GET /api/tickets/:ticketId/comments` | List a ticket's notes |
| `POST /api/tickets/:ticketId/comments` | Add a note |
| `POST /api/tickets/:id/escalate` | Move a ticket to another department |

All require a token.

## Decisions

### Comments are a nested resource

They live at `/api/tickets/:ticketId/comments`, not at a top-level
`/api/comments`. A comment with no ticket makes no sense, and the URL says so.

The route parameter is named `:ticketId` rather than `:id` so the controller
reads clearly — `req.params.ticketId` states what it holds.

### No update and no delete on comments

Decided back in phase 0 and implemented here. Case notes are a record of what
happened; that record does not get rewritten. It is also why the table has no
`updated_at` — having the column would imply editing is allowed.

### A closed ticket takes no new comments

Left open in phase 1, settled here: a closed ticket is final, so its history
stops growing too. Returns `409`, same as trying to modify one.

### Escalation is an action, not CRUD

`POST /api/tickets/:id/escalate`, not a field in `PATCH`.

CRUD operations are generic — create, read, update, delete — and know nothing
about the business. Escalating has rules of its own and writes to two tables.
A `PATCH` setting `department_id` would change a number; this says what is
actually happening.

**The rule: when an operation has a name in the business — escalate, cancel,
approve, refund — it gets a verb in the URL rather than becoming another field
in a PATCH.**

### Escalation runs in a transaction

Two writes that have to happen together:

1. `UPDATE tickets SET department_id = ...`
2. `INSERT INTO ticket_escalations ...`

If the first succeeds and the second fails, the result is a ticket sitting in
Billing with no trace of how it got there. The history would lie.

`BEGIN` opens the transaction, `COMMIT` makes it permanent, `ROLLBACK` undoes
everything — including the UPDATE that already ran.

**This is the one function in the project that does not use `pool.query()`.** A
transaction has to run on a single connection, since BEGIN and COMMIT live on
that connection, and the pool hands out a different one per call. So it calls
`pool.connect()`, holds that client, and releases it in a `finally` block —
without which every escalation would leak a connection until the pool ran dry.

Verified by escalating to a department that does not exist: the UPDATE ran,
the INSERT failed on the foreign key, and the ticket stayed where it was.

### The test for spotting a transaction

Ask what happens if only the first operation succeeds. If the answer is
"inconsistent data", it needs a transaction. A bank transfer is the textbook
case; the support-side equivalent is applying account credit and recording the
supervisor approval that authorised it.

### Escalating to the same department is rejected

A move to where the ticket already is is not a move, and allowing it would
fill the history with meaningless rows. `409`.

The comparison uses `Number(toDepartmentId)`, because a value from JSON may
arrive as a string and `"2" === 2` is false in JavaScript — a check that would
fail silently otherwise.

## Still open

- No role-based permissions. Phase 4.
- Nothing reads `ticket_escalations` yet; the data is recorded but there is no
  endpoint to see a ticket's path.
- No audit log of who changed what on a ticket itself, only of escalations.
- No tests. Phase 5.