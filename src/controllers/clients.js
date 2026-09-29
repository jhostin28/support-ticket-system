// Client controller.
//
// Same shape as src/controllers/departments.js, with three fields instead of
// one and a nullable email.

import * as clientsService from '../services/clients.js';

// GET /clients — list active clients.
export async function list(req, res) {
  try {
    const clients = await clientsService.getAll();
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}

// POST /clients — create one client.
export async function create(req, res) {
  // || {} guards against a request with no body at all: destructuring
  // undefined throws before the validation below ever runs.
  const { name, phone, email } = req.body || {};

  // email is left out on purpose. The column is nullable because not every
  // caller has an email address, and requiring one would lock those customers
  // out of the system entirely. See docs/design.md.
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }

  try {
    const client = await clientsService.create({ name, phone, email });
    res.status(201).json(client);
  } catch (err) {
    // 23505 is a unique violation. In departments it fired on a duplicate
    // name; here the UNIQUE column is email — two clients sharing one almost
    // always means a duplicate record.
    //
    // Note that a missing email does NOT trip this: PostgreSQL allows many
    // NULL values in a UNIQUE column, since NULL is the absence of a value
    // rather than a value.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'a client with that email already exists' });
    }

    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}