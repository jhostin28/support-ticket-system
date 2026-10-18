# Phase 5 — Tests, Docker and CI

**Status:** done

The phase that makes the project publishable. No new endpoints: what changes
is that the system can now be verified automatically and run by anyone.

## What was built

| Piece | What it does |
|---|---|
| 21 integration tests | Verify the whole API in about 10 seconds |
| `Dockerfile` | Packages the API into an image |
| `docker-compose.yml` | Runs the API and PostgreSQL together |
| `.github/workflows/ci.yml` | Runs the tests on every push |
| `scripts/seed.js` | Creates the first supervisor on a fresh install |

## Decisions

### Integration tests over unit tests

Every test goes through the real stack — routes, middleware, controllers,
services, PostgreSQL. Nothing is mocked.

For an API this covers far more per test: one `POST /api/tickets` checking for
a `201` exercises five layers at once. Unit tests would verify each piece in
isolation and still miss the wiring between them.

### Vitest

The project is ESM, and Vitest handles `import` natively while Jest needs
configuration for it. The syntax is the same, so the knowledge transfers.

Jest is more common in job listings, which was the argument the other way.

### A separate test database

Tests truncate tables before each run, so they cannot point at the real one.
`.env.test` overrides `.env` through `tests/setup.js`, which Vitest loads
before anything else.

`TRUNCATE ... RESTART IDENTITY CASCADE` rather than `DELETE`: faster, and
resetting the SERIAL counters means ids start at 1 every run, so tests can
rely on them.

### Test files run one at a time

The first two database test files failed with duplicate-key errors. Vitest
runs files in parallel by default, and both were truncating and seeding the
same database at the same time.

`fileParallelism: false` fixed it. Test time went from 1.6s to 10s — the cost
of correctness. The alternative, a database per file, is not worth it at this
size.

**Worth remembering: tests sharing a database cannot run in parallel.** That
is the first thing to check when tests fail intermittently.

### What the tests protect

They were not written for coverage. Each one guards a decision made in an
earlier phase:

| Test | Protects |
|---|---|
| Login gives the same error both ways | The user-enumeration decision, phase 1 |
| `updated_at` moves past `created_at` | The trigger, phase 2 |
| A closed ticket returns 409 | The business rule, phase 2 |
| Body-supplied `author_id` is ignored | Identity comes from the token, phase 2 |
| An agent gets 403 on another department | Permissions, phase 4 |

The permission ones matter most: phase 4 shipped with a real security hole —
a duplicated route left an endpoint unprotected — found only by testing with
an agent token by hand. These tests catch that class of bug immediately.

### `app.js` separated from `server.js`

Supertest needs the Express app but must not open a port. They were in one
file, so importing the app would have started a real server on every test run.

`app.js` configures, `server.js` is the only thing that listens.

### Docker: layer order is deliberate

`package*.json` is copied and installed **before** the source. Docker caches
layers, so as long as the dependencies have not changed it reuses the cached
install. Editing a controller rebuilds in seconds instead of minutes.

`npm ci` rather than `npm install`: exact versions from the lockfile, so the
build is reproducible. `--omit=dev` keeps nodemon and vitest out of the
production image.

`.dockerignore` keeps `node_modules` and `.env` out of the image — the local
`node_modules` is compiled for Windows and would not work on Linux anyway,
and the `.env` holds real credentials.

### Postgres 18 changed where the volume mounts

The first `docker compose up` failed: Postgres 18 expects the mount at
`/var/lib/postgresql`, not `/var/lib/postgresql/data` as earlier versions did.

Mounting `./sql` at `/docker-entrypoint-initdb.d` means the schema is applied
automatically the first time the database is created — no manual step.

`depends_on` with `condition: service_healthy` waits for the database to
accept connections. Waiting for the container to merely exist is not enough;
the API would start first and fail to connect.

### `DB_HOST: db`, not localhost

Inside a compose network, services reach each other by service name. From the
API container's point of view, `localhost` is itself.

### CI runs on a clean machine

That is the whole point. Tests passing locally prove they pass on a machine
with things configured by hand over several weeks. GitHub starts from nothing
every time, which is the only way to know a fresh clone works.

The workflow installs dev dependencies — the opposite of the Dockerfile,
since the tests need Vitest — and applies the schema with `psql`, because
there is no pgAdmin on that machine.

The `JWT_SECRET` there is a throwaway value: it only signs tokens inside a
run that is destroyed afterwards. The real one is never committed.

## Still open

- No coverage report. Passing tests only prove the covered paths work.
- No tests for comments or escalation, the two most complex flows.
- `docker-compose.yml` runs the production build, so there is no hot reload
  for development.
- Nothing is deployed anywhere yet. Phase 9.