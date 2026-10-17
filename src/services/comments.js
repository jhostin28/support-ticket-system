// Comment service.
//
// Notes added to a case over time. No update and no delete: case notes are a
// record of what happened, and that record does not get rewritten.

import pool from '../db.js';

// C — create one comment on a ticket.
//
// userId comes from the token, never from the body. If the client supplied it,
// anyone could post a note in another agent's name.
export async function create({ body, ticketId, userId }) {
  const result = await pool.query(
    `INSERT INTO comments (body, ticket_id, user_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [body, ticketId, userId]
  );

  return result.rows[0];
}

// R — list the comments on one ticket, oldest first.
//
// Chronological order, unlike tickets: a case history read backwards makes no
// sense.
export async function getByTicket(ticketId) {
  const result = await pool.query(
    'SELECT * FROM comments WHERE ticket_id = $1 ORDER BY created_at ASC',
    [ticketId]
  );

  return result.rows;
}