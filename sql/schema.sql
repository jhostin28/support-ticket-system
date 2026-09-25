-- Support ticket system — database schema
-- PostgreSQL 18
--
-- Run this on an empty database. Order matters: a table must exist
-- before another table can reference it with a foreign key.


-- ---------------------------------------------------------------------------
-- Custom types
-- ---------------------------------------------------------------------------

CREATE TYPE ticket_status   AS ENUM ('pending', 'in_progress', 'resolving', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE user_role       AS ENUM ('agent', 'supervisor');


-- ---------------------------------------------------------------------------
-- Tables with no dependencies
-- ---------------------------------------------------------------------------

CREATE TABLE departments (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE clients (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    phone      VARCHAR(20)  NOT NULL,
    email      VARCHAR(100) UNIQUE,
    is_active  BOOLEAN      NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- Tables that reference the ones above
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL DEFAULT 'agent',
    department_id INTEGER      NOT NULL REFERENCES departments(id),
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(200)    NOT NULL,
    description   TEXT            NOT NULL,
    status        ticket_status   NOT NULL DEFAULT 'pending',
    priority      ticket_priority NOT NULL DEFAULT 'medium',
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ,
    closed_at     TIMESTAMPTZ,
    client_id     INTEGER         NOT NULL REFERENCES clients(id),
    user_id       INTEGER         REFERENCES users(id),
    department_id INTEGER         NOT NULL REFERENCES departments(id)
);


-- ---------------------------------------------------------------------------
-- Tables that reference tickets
-- ---------------------------------------------------------------------------

CREATE TABLE comments (
    id         SERIAL PRIMARY KEY,
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ticket_id  INTEGER     NOT NULL REFERENCES tickets(id),
    user_id    INTEGER     NOT NULL REFERENCES users(id)
);

CREATE TABLE ticket_escalations (
    id                 SERIAL PRIMARY KEY,
    ticket_id          INTEGER     NOT NULL REFERENCES tickets(id),
    from_department_id INTEGER     NOT NULL REFERENCES departments(id),
    to_department_id   INTEGER     NOT NULL REFERENCES departments(id),
    user_id            INTEGER     NOT NULL REFERENCES users(id),
    moved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);