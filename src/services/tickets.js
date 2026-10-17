// Ticket service.
//
// The core resource. Same shape as the other services (see
// src/services/clients.js), with more fields and more that the caller is
// deliberately not allowed to set.

import pool from '../db.js';

// Create one ticket.
//
// What is NOT a parameter here matters as much as what is:
//
// - status: a new ticket always starts as 'pending', filled by the DEFAULT in
//   the schema. Accepting it from the client would allow creating a ticket
//   that is already closed.
// - createdAt / updatedAt: also DEFAULT NOW().
//
// And authorId, userId and departmentId do not come from the request body.
// The controller resolves them from req.user — the token — so nobody can open
// a ticket in someone else's name or drop one straight into another
// department's queue without working it first.
//
// authorId and userId get the same value on creation: the agent who takes the
// call keeps the case. They diverge later, when a ticket is reassigned.
export async function create({ title, description, priority, clientId, authorId, userId, departmentId }) {
  const result = await pool.query(
    `INSERT INTO tickets (title, description, priority, client_id, author_id, user_id, department_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [title, description, priority, clientId, authorId, userId, departmentId]
  );

  return result.rows[0];
}


// List tickets, optionally filtered.
//
// The SQL is built up piece by piece because the filters are optional: a
// request may send none, one, or all three.
export async function getAll({ status, departmentId, clientId } = {}) {
  // Start with a condition that is always true, so every filter below can be
  // appended with AND without checking whether it is the first one.
  const conditions = ['1 = 1'];
  const values = [];

  // Each filter adds its condition AND its value, keeping the $n numbers in
  // step with the array. values.length + 1 is the next placeholder number.
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  if (departmentId) {
    values.push(departmentId);
    conditions.push(`department_id = $${values.length}`);
  }

  if (clientId) {
    values.push(clientId);
    conditions.push(`client_id = $${values.length}`);
  }

  const result = await pool.query(
    // High priority first, then oldest first within the same priority, so an
    // old low-priority ticket does not sit forgotten forever.
    `SELECT * FROM tickets
     WHERE ${conditions.join(' AND ')}
     ORDER BY priority DESC, created_at ASC`,
    values
  );

  return result.rows;
}

// Find one ticket by id.
//
// Returns undefined when nothing matches — not an error, just an answer. The
// controller turns that into a 404.
export async function findById(id) {
  const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  return result.rows[0];
}

// Update one ticket.
//
// Built dynamically because PATCH means partial: only the fields actually
// sent get touched. Sending just a status must not blank out the title.
//
// Returns undefined if no ticket has that id.
export async function update(id, fields) {
  const sets = [];
  const values = [];

  // Each field that was sent adds its own "column = $n" and its value,
  // keeping the numbering in step with the array.
  for (const [column, value] of Object.entries(fields)) {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  }

  // Nothing to update.
  if (sets.length === 0) {
    return findById(id);
  }

  // The id goes last, after all the field values.
  values.push(id);

  const result = await pool.query(
    `UPDATE tickets
     SET ${sets.join(', ')}
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0];
}

// Escalate a ticket to another department.
//
// Two operations that have to happen together: change the ticket's department
// AND record who moved it and from where. One without the other leaves the
// data lying — a ticket in Billing with no trace of how it got there.
//
// Unlike every other function here, this one does not use pool.query(). A
// transaction has to run on a SINGLE connection: BEGIN and COMMIT live on that
// connection, and the pool would hand out a different one each call.
export async function escalate({ ticketId, toDepartmentId, fromDepartmentId, userId }) {
  // Borrow one connection from the pool and hold it for the whole transaction.
  const client = await pool.connect();

  try {
    // Nothing below is written for real until COMMIT.
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE tickets
       SET department_id = $1
       WHERE id = $2
       RETURNING *`,
      [toDepartmentId, ticketId]
    );

    await client.query(
      `INSERT INTO ticket_escalations
         (ticket_id, from_department_id, to_department_id, user_id)
       VALUES ($1, $2, $3, $4)`,
      [ticketId, fromDepartmentId, toDepartmentId, userId]
    );

    // Both succeeded — make it permanent.
    await client.query('COMMIT');

    return updated.rows[0];
  } catch (err) {
    // Anything failed — undo everything, including the UPDATE that already
    // ran. The database goes back to how it was before BEGIN.
    await client.query('ROLLBACK');
    throw err;
  } finally {
    // Always return the connection to the pool, success or failure. Without
    // this the pool leaks connections and eventually runs out.
    client.release();
  }
}