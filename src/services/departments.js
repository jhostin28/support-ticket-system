// Department service.
//
// The only layer that talks to the database. Everything here takes plain
// values and returns plain values — it knows nothing about HTTP, requests or
// status codes. That is the controller's job.
//
// Keeping SQL in one place means a future switch to an ORM would touch only
// this folder, and the same function can be reused by an endpoint, a script
// or a scheduled job.

import pool from '../db.js';

// List every department.
//
// ORDER BY makes the order predictable. Without it PostgreSQL gives no
// guarantee, so the same query could come back in a different order.
export async function getAll() {
  // await waits for the database to answer before moving on. Any function
  // using await must be declared async.
  const result = await pool.query('SELECT * FROM departments ORDER BY id');

  // pool.query returns a pg object holding rows, rowCount, column metadata
  // and more — all database plumbing. Returning just .rows keeps that detail
  // in this layer, so the caller gets the departments and nothing else.
  return result.rows;
}

// Create one department and return it.
export async function create(name) {
  const result = await pool.query(
    // $1 is a placeholder, never string concatenation.
    // The SQL and the values travel separately, so PostgreSQL always treats
    // the value as data and never as a command. Pasting the value into the
    // string instead would allow SQL injection: a name like
    // '); DROP TABLE departments; -- would run as a second statement.
    //
    // RETURNING * hands back the row that was just inserted. It is needed
    // because the id comes from SERIAL — the database generated it, so this
    // is the only way to know it without a second query.
    'INSERT INTO departments (name) VALUES ($1) RETURNING *',
    [name]
  );

  // rows is always an array, even for a single row. [0] unwraps it, so the
  // caller receives one department rather than a list containing one.
  return result.rows[0];
}