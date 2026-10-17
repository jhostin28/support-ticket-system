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

// GET /tickets — list tickets, optionally filtered by query parameters.
//
// Query parameters are what comes after the ? in the URL:
//   /api/tickets?status=pending&departmentId=1
//
// Express puts them in req.query. They are optional by nature: none, one or
// all three. Sending none returns every ticket.
export async function list(req, res) {
  const { status, departmentId, clientId } = req.query;

  try {
    const tickets = await ticketsService.getAll({ status, departmentId, clientId });
    res.json(tickets);
  } catch (err) {
    // 22P02 — invalid input for a type. Here: a status outside the ENUM's
    // list, or a departmentId that is not a number.
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'invalid filter value' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}

// GET /tickets/:id — fetch one ticket.
//
// The :id in the route is a path parameter — a slot that takes its value from
// the URL. A request to /api/tickets/5 leaves req.params.id as "5".
//
// Note it arrives as a string, not a number. PostgreSQL casts it for the
// comparison, so no conversion is needed here.
export async function getOne(req, res) {
  const { id } = req.params;

  try {
    const ticket = await ticketsService.findById(id);

    // undefined from the service means no row matched. 404 is right because
    // this request is a lookup — asking for something that is not there.
    //
    // Compare with POST: creating a department that does not exist yet is the
    // normal case and answers 201. What changes is the intent of the request.
    if (!ticket) {
      return res.status(404).json({ error: 'ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    // 22P02 — invalid input for the type. Here: an id that is not a number,
    // such as /api/tickets/abc.
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'invalid ticket id' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}

// PATCH /tickets/:id — update one ticket.
//
// PATCH, not PUT: only the fields sent get changed. PUT would mean replacing
// the whole resource, blanking out anything left out.
//
// What cannot be changed here:
// - author_id and created_at: facts about the past.
// - department_id: escalating also has to record who moved it and where from,
//   so it gets its own endpoint with a transaction. Phase 3.
// - user_id directly: an agent claims a ticket for themselves with
//   { "claim": true }. Assigning someone else is a supervisor action, phase 4.
export async function update(req, res) {
  const { id } = req.params;
  const { title, description, status, priority, claim } = req.body || {};

  try {
    const existing = await ticketsService.findById(id);

    if (!existing) {
      return res.status(404).json({ error: 'ticket not found' });
    }

    // A closed ticket is final — the rule this system took from how support
    // actually worked. Enforced here rather than in the database because it
    // depends on the ticket's previous state, which a CHECK constraint
    // cannot see.
    if (existing.status === 'closed') {
      return res.status(409).json({ error: 'a closed ticket cannot be modified' });
    }

    // Only the fields that were actually sent end up in this object. The
    // column names come from this code, never from the request — the service
    // interpolates them into the SQL, so letting the client name columns
    // would be an injection hole.
    const fields = {};

    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (priority !== undefined) fields.priority = priority;
    if (claim === true) fields.user_id = req.user.id;

    if (status !== undefined) {
      fields.status = status;

      // Timestamps follow the status instead of being sent by the client.
      // Otherwise an agent could mark a ticket resolved with a date from last
      // week, and the resolution-time numbers would be fiction.
      //
      // Only set once: a ticket that goes back to in_progress and is resolved
      // again keeps its first resolution time.
      if (status === 'resolving' && !existing.resolved_at) {
        fields.resolved_at = new Date();
      }

      if (status === 'closed' && !existing.closed_at) {
        fields.closed_at = new Date();
      }
    }

    const ticket = await ticketsService.update(id, fields);
    res.json(ticket);
  } catch (err) {
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'invalid value for status, priority or id' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}