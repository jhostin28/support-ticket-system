// User controller.
//
// Same shape as the departments controller, with more validation because
// there are more fields and one of them is a foreign key.

import * as usersService from '../services/users.js';

// POST /users — create one user.
export async function create(req, res) {
  // Destructuring pays off here: one line instead of five separate
  // req.body.something reads.
  const { name, email, password, role, departmentId } = req.body;

  // || means "or", so this rejects if ANY required field is missing.
  //
  // role is not checked because it is the only optional field: the column has
  // DEFAULT 'agent', so leaving it out lets PostgreSQL fill it in.
  if (!name || !email || !password || !departmentId) {
    return res.status(400).json({
      error: 'name, email, password and departmentId are required',
    });
  }

  try {
    const user = await usersService.create({ name, email, password, role, departmentId });

    // The service already left password_hash out of what it returns, so
    // nothing sensitive can leak through this line.
    res.status(201).json(user);
  } catch (err) {
    // 23505 — unique violation. email is UNIQUE because users log in with it,
    // so a duplicate would make login ambiguous. 409: the request is valid but
    // clashes with what already exists.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'a user with that email already exists' });
    }

    // 23503 — foreign key violation: departmentId points at a department that
    // is not there. 400 and not 409, because nothing is in conflict — the
    // client simply sent a value that was never valid.
    if (err.code === '23503') {
      return res.status(400).json({ error: 'that department does not exist' });
    }

    // Anything else is unexpected: detail to the server log, generic message
    // to the client.
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}