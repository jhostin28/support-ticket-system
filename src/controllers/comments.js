// Comment controller.
//
// Comments are a nested resource: they live under a ticket, so the ticket id
// comes from the path (/tickets/:ticketId/comments) and not from the body.

import * as commentsService from '../services/comments.js';
import * as ticketsService from '../services/tickets.js';

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