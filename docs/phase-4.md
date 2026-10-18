# Phase 4 — Role and department permissions

**Status:** done

Until now any authenticated user could do anything. This phase adds
authorization: being identified is no longer the same as being allowed.

No new endpoints — the same ones, with rules about who may use them.

## What was built

| Rule | Where |
|---|---|
| Creating departments and users requires `supervisor` | `requireRole` middleware |
| Writing to a ticket requires it to be in your department | `canActOnTicket` |
| A supervisor can act on any ticket | same |
| Reading is open to any authenticated user | no check |

Plus a seed script, because the rules above created a chicken-and-egg problem.

## Decisions

### Two kinds of permission, in two different places

| | Depends on | Lives in |
|---|---|---|
| By role | who you are | middleware — the answer is in the token |
| By membership | your relationship to the resource | controller — needs the resource |

`requireRole('supervisor')` can run as middleware because the role travels in
the JWT. `canActOnTicket` cannot: it needs the ticket to know its department,
and the controllers already fetch it. Doing it in a middleware would mean
fetching the same row twice.

### `requireRole` is a factory

It returns a middleware rather than being one, which is what allows the role
to be named at the route:

    router.post('/', requireAuth, requireRole('supervisor'), controller.create)

Without that shape it would take a separate middleware per role.

### 403, not 401

`401` means "I do not know who you are" — no token, or an invalid one. `403`
means "I know exactly who you are and you still may not do this". Telling an
agent to log in again would not help; they are already logged in.

### Reading is open, writing is restricted by department

An agent can read any ticket but only write to ones in their own queue.

This came straight from how the work actually goes: a transferred call means
reading a case that started in another department before speaking to the
customer. But a mobile agent has no business closing a washing-machine case.

`?departmentId=` already narrows the list when an agent wants only their own.

### The boundary is the department, not the person

An agent can work any ticket in their queue, including ones another agent
opened.

Restricting by person would break the dropped-call case this system is built
around: the customer rings back, a different agent picks up, and that agent
has to be able to work it. It would also strand tickets whose owner is on
holiday or has left.

### A seed script, not an open endpoint

Creating users now requires a supervisor, which leaves no way to create the
first one on a fresh install.

`npm run seed` creates three departments and one supervisor. It calls the
services rather than writing SQL, so the password goes through the same bcrypt
path as every other user — which is the payoff of having put hashing in the
service back in phase 1.

The alternative considered was leaving registration open while the users table
is empty. Rejected: it is a permanently open endpoint solving a one-time
problem, and an empty table at the wrong moment would let anyone create a
supervisor.

### Only two roles, on purpose

In a real company, accounts are created by IT, not by the call centre
supervisor — which would argue for a third `admin` role.

Left at two deliberately. Two roles already demonstrate the mechanism, and the
third would be more of the same at the cost of an `ALTER TYPE` and changes
across routes and docs. Noted here as a known simplification rather than an
oversight.

## A bug worth remembering

Both `departments.js` and `users.js` ended up with two `router.post('/')`
lines: the old unprotected one and the new one with `requireRole`. Express
matches top to bottom and uses the first, so the protected route never ran.

It fails silently — no warning, no error — and the file looks protected when
read. Found only by testing with an agent token and getting a `201` where a
`403` was expected.

## Still open

- No `admin` role, as above.
- A supervisor cannot assign a ticket to a specific agent; `claim` only
  assigns to the caller.
- Nothing reads `ticket_escalations` yet.
- No tests. Phase 5.