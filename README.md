# support-ticket-system

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
enough to defend it in a technical interview — which is why each phase ships with
documentation explaining what was built, what was decided and what was traded
away.

## Stack

- **Node.js** — chosen because it was my strongest backend base; the point of the
  project is to learn system design, not a new language at the same time. The
  data model is language-independent.
- **PostgreSQL**
- **REST API** with JWT authentication
- **Docker** and **GitHub Actions** — added at the end, once the core is solid

No Redis, no elaborate frontend, no payments. Those get added only if a real
problem justifies them.

## Phases

A phase is not a topic — it is a slice of the system that works end to end.

| Phase | Scope | Status |
|---|---|---|
| 0 | Data model design | Done |
| 1 | Database, departments, users, JWT login | Not started |
| 2 | Tickets and clients CRUD | Not started |
| 3 | Comments and escalation | Not started |
| 4 | Role-based permissions | Not started |
| 5 | Docker and CI/CD | Not started |

This plan will change as the project is built. Phases get adjusted when building
one reveals something the plan did not anticipate.

## Documentation

- [Data model design](docs/design.md) — the six tables, their columns and the
  reasoning behind each decision, including the trade-offs.

## What the system does

- Register a client
- Create a ticket
- Change a ticket's status: pending, in progress, resolving, closed
- Edit ticket information
- Assign or escalate tickets between departments
- Add comments to a case

Clients do not log in. A client calls, and an agent creates the ticket on their
behalf — the same model I worked in. Only agents and supervisors have accounts.
