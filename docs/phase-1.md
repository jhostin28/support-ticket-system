# Phase 1 — Database, departments, users and JWT login

**Status:** done

The first vertical slice: a running API backed by PostgreSQL, with users who
can log in and endpoints that reject anyone without a valid token.

Authentication came first because almost everything else depends on knowing
who is making the request. Building tickets without it would mean passing a
user id by hand in every request and rewriting all of it later.

## What was built

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | no | Liveness check |
| `GET /api/departments` | no | List departments |
| `POST /api/departments` | **yes** | Create a department |
| `POST /api/users` | no | Create a user |
| `POST /api/auth/login` | no | Verify credentials, return a JWT |

Plus the database itself: six tables and three custom types, in
`sql/schema.sql`.

## Decisions

### Three layers: routes, controllers, services

- **routes** — maps a method and path to a function, and declares which routes
  need a token
- **controllers** — reads the request, validates, calls the service, chooses
  the status code
- **services** — the only layer that touches the database

The test for whether the split is real: a service can be called from a CSV
import script, where there is no HTTP request at all. A controller cannot,
because it needs `req` and `res`.

**Cost:** three files for a simple endpoint. It feels heavy on a small project
and pays off as soon as the logic grows.

### Password hashing lives in the service, not the controller

`usersService.create()` takes the plain password and hashes it itself.

The alternative — hashing in the controller and passing the hash down — means
every future caller has to remember to hash first. Forget once and a plain
password is stored. Here it cannot be skipped.

bcrypt with 10 salt rounds. Slowness is the point: a fast hash like SHA-256
lets an attacker with a stolen database try millions of guesses per second.

### Login returns the same error for both failures

Unknown email and wrong password both return `401 invalid email or password`.

Saying which one failed would let an attacker discover which accounts exist by
trying addresses one at a time — user enumeration. "Wrong password" confirms a
hit and halves the work.

**Cost:** a legitimate user who mistypes does not learn which field was wrong.

### JWT carries only id and role

A JWT's payload can be read by anyone without the key — the signature prevents
tampering, not reading. Paste one into jwt.io and it is all there. So the
payload holds the minimum needed to identify the caller: `userId` and `role`.

The token expires in 24 hours: long enough to be usable, short enough that a
stolen one stops working.

The signing secret lives in `.env`. Anyone holding it can issue a token
claiming `role: supervisor`.

### The middleware attaches identity to the request

`requireAuth` verifies the token and sets `req.user = { id, role }` before
calling `next()`.

This matters beyond convenience: when comments are added in a later phase,
their `user_id` will come from `req.user.id` and never from the request body.
If the client supplied it, anyone could post as someone else.

It also never queries the database — everything needed is inside the token.
That is what makes the API stateless.

### Errors are mapped, not leaked

Express's default error page returns HTML and leaks absolute file paths and
line numbers. Every controller catches instead:

| Situation | Status |
|---|---|
| Missing required field | `400` |
| Foreign key that does not exist (`23503`) | `400` |
| Invalid credentials | `401` |
| Duplicate unique value (`23505`) | `409` |
| Anything unexpected | `500`, detail to the log only |

PostgreSQL tags each error with a code and `pg` passes it through, which is
what makes the distinction possible.

## A bug found while testing

A request with no body at all crashed with a 500: destructuring `undefined`
throws before the validation below it ever runs. Fixed with
`req.body || {}` in all three controllers.

The lesson: validation only protects what it actually reaches.

## Still open

- `updated_at` does not change on update yet. `DEFAULT NOW()` only fires on
  insert, so this needs a trigger — phase 2.
- No role-based permissions. Any authenticated user can do anything an
  authenticated user can do; agent versus supervisor comes in phase 4.
- No `GET /api/users` and no way to list or fetch a single department.
- No tests. Phase 5.
- The token cannot be revoked before it expires. Acceptable at 24 hours;
  a refresh-token scheme would be the answer if it stops being.