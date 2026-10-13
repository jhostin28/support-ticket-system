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