// Comment controller.
//
// Comments are a nested resource: they live under a ticket, so the ticket id
// comes from the path (/tickets/:ticketId/comments) and not from the body.

import * as commentsService from '../services/comments.js';
import * as ticketsService from '../services/tickets.js';
import { canActOnTicket } from '../middleware/permissions.js';

// C — POST /tickets/:ticketId/comments
export async function create(req, res) {
  const { ticketId } = req.params;
  const { body } = req.body || {};

  if (!body) {
    return res.status(400).json({ error: 'body is required' });
  }

  try {
    // Check the ticket exists before inserting. The foreign key would catch it
    // anyway, but that arrives as a database error — this returns a clear 404,
    // which is the right answer for a path pointing at something missing.
    const ticket = await ticketsService.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'ticket not found' });
    }

    // Writing a note is working the case, so the same department rule applies
    // as for updating or escalating. See src/middleware/permissions.js.
    if (!(await canActOnTicket(req.user, ticket))) {
      return res.status(403).json({ error: 'this ticket belongs to another department' });
    }

    // Same rule as everywhere else in this system: a closed ticket is final.
    // Its history does not keep growing after it is closed.
    if (ticket.status === 'closed') {
      return res.status(409).json({ error: 'cannot comment on a closed ticket' });
    }

    const comment = await commentsService.create({
      body,
      ticketId,
      userId: req.user.id,
    });

    res.status(201).json(comment);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'invalid ticket id' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}

// R — GET /tickets/:ticketId/comments
//
// No department check here. Reading stays open, same as listing tickets: an
// agent taking a transferred call needs the case history before speaking to
// the customer, whichever queue it started in.
export async function list(req, res) {
  const { ticketId } = req.params;

  try {
    const ticket = await ticketsService.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: 'ticket not found' });
    }

    const comments = await commentsService.getByTicket(ticketId);
    res.json(comments);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'invalid ticket id' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}