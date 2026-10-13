// Ticket controller.
//
// Does more work than the others (see src/controllers/clients.js) because the
// ticket's owner and department are not taken from the request body — they are
// resolved from the authenticated user.

import * as ticketsService from '../services/tickets.js';
import * as usersService from '../services/users.js';

// POST /tickets — create one ticket.
export async function create(req, res) {
  const { title, description, priority, clientId } = req.body || {};

  // Only these two are required from the client. Everything else is either
  // defaulted by the database or resolved from the token below.
  if (!title || !description || !clientId) {
    return res.status(400).json({
      error: 'title, description and clientId are required',
    });
  }

  try {
    // req.user was set by requireAuth, from the token. See
    // src/middleware/auth.js.
    //
    // The department is looked up rather than read from the token: an agent
    // moved from Tier 1 to Billing should have their next ticket land in
    // Billing immediately, not when their token expires.
    const agent = await usersService.findById(req.user.id);

    if (!agent) {
      // The token is valid but the user it names is gone — deleted between
      // login and now. Nothing the client can fix by retrying.
      return res.status(401).json({ error: 'invalid or expired token' });
    }

    const ticket = await ticketsService.create({
      title,
      description,
      // DEFAULT only fires when a column is absent from the INSERT, not when
      // it is present as NULL. Passing undefined would send NULL and break the
      // NOT NULL constraint, so the default is applied here instead.
      priority: priority || 'medium',
      clientId,
      authorId: req.user.id,
      userId: req.user.id,
      departmentId: agent.department_id,
    });

    res.status(201).json(ticket);
  } catch (err) {
    // 23503 — a foreign key that does not exist. In practice: a clientId with
    // no matching client. 400, because the client sent a value that was never
    // valid.
    if (err.code === '23503') {
      return res.status(400).json({ error: 'that client does not exist' });
    }

    // 22P02 — invalid input for the type. Here it means a priority outside
    // the ENUM's list, such as "urgent".
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'priority must be low, medium or high' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}