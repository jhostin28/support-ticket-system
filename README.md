# support-ticket-system

![CI](https://github.com/jhostin28/support-ticket-system/actions/workflows/ci.yml/badge.svg)

REST API for a support ticket system, built to learn backend fundamentals from
the ground up.

## About this project

A support ticket system: customers report problems, agents work the cases,
escalate them between departments and keep a record of what was done.

I chose this domain because I spent two and a half years working inside systems
like this one, in bilingual technical support at Teleperformance and Alorica,
using Salesforce and Sprinklr. That means the design decisions here come from
real experience with how these systems are used, not from a tutorial.

The goal of the project is not speed. It is to understand every decision well
enough to defend it in a technical interview — which is why each phase ships
with documentation explaining what was built, what was decided and what was
traded away.

## Stack

- **Node.js** — chosen because it was my strongest backend base; the point of
  the project is to learn system design, not a new language at the same time.
  The data model is language-independent.
- **PostgreSQL**, accessed through the `pg` driver with hand-written SQL rather
  than an ORM, so the queries stay visible
- **Express** with JWT authentication and bcrypt password hashing
- **Vitest** and **Supertest** for integration tests
- **Docker** and **GitHub Actions**

No Redis, no elaborate frontend, no payments. Those get added only if a real
problem justifies them — and if one does, the phase that justifies it is the
one that adds it.

## Phases

A phase is not a topic — it is a slice of the system that works end to end.

| Phase | Scope | Status |
|---|---|---|
| 0 | Data model design | Done |
| 1 | Database, departments, users, JWT login | Done |
| 2 | Tickets and clients CRUD | Done |
| 3 | Comments and escalation | Done |
| 4 | Role and department permissions | Done |
| 5 | Tests, Docker and CI | Done |
| 6 | Load testing with k6, indexes | Not started |
| 7 | Observability: structured logs, metrics, dashboard | Not started |
| 8 | Incident engineering and postmortems | Not started |
| 9 | Deployment on AWS | Not started |
| 10 | High availability: load balancer, two instances | Not started |
| 11 | Backups and a tested restore | Not started |

Phases 0 to 5 build the application. Phases 6 to 11 are about operating it —
measuring it, breaking it on purpose, and running it somewhere real.

This plan changes as the project is built. Phases get adjusted when building
one reveals something the plan did not anticipate.

## Documentation

- [Data model design](docs/design.md) — the six tables, their columns and the
  reasoning behind each decision, including the trade-offs
- [API reference](docs/api.md) — every endpoint, what it takes and what it
  returns
- [Phase 1](docs/phase-1.md) — auth, layering and error handling
- [Phase 2](docs/phase-2.md) — tickets, business rules and the first trigger
- [Phase 3](docs/phase-3.md) — comments, escalation and transactions
- [Phase 4](docs/phase-4.md) — role and department permissions
- [Phase 5](docs/phase-5.md) — tests, Docker and CI

## Running it

### With Docker

Everything in one command. No Node or PostgreSQL needed on the machine.

```
git clone https://github.com/jhostin28/support-ticket-system.git
cd support-ticket-system
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
docker compose up --build
```

The schema is applied automatically the first time the database starts.

### Without Docker

Requires Node.js and PostgreSQL.

```
git clone https://github.com/jhostin28/support-ticket-system.git
cd support-ticket-system
npm install
```

Create a database and run `sql/schema.sql` against it.

Copy `.env.example` to `.env` and fill it in. `JWT_SECRET` should be a long
random string:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then:

```
npm run seed    # creates three departments and the first supervisor
npm run dev
```

The seed script exists because creating users requires a supervisor, which
leaves no way to create the first one through the API.

### Tests

```
npm test
```

21 integration tests against a separate database. They need
`support_ticket_system_test` to exist with the schema applied, and a
`.env.test` pointing at it.

## What the system does

- Register a client
- Create a ticket
- Change a ticket's status: pending, in progress, resolving, closed
- Edit ticket information
- Escalate tickets between departments, with a record of each move
- Add comments to a case

Clients do not log in. A client calls, and an agent creates the ticket on their
behalf — the same model I worked in. Only agents and supervisors have accounts.

Agents work tickets in their own department; supervisors work any ticket and
are the only ones who can create departments and user accounts.