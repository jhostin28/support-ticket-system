// Client service.
//
// Same three-layer shape as src/services/departments.js, with two differences
// worth noting: the soft-delete filter and a multi-value insert.

import pool from '../db.js';

// List active clients only.
//
// The WHERE is the cost of soft delete, documented in docs/design.md: clients
// are never removed, is_active is set to false instead. Every query that lists
// clients has to filter on it — forget the WHERE once and "deleted" clients
// show up in the results.
//
// ORDER BY makes the order predictable; without it PostgreSQL gives no
// guarantee.
export async function getAll() {
  const result = await pool.query(
    'SELECT * FROM clients WHERE is_active = true ORDER BY id'
  );
  return result.rows;
}

// Create one client and return it.
//
// The parameter is a single object rather than three positional arguments, the
// same reasoning as usersService.create() in src/services/users.js: the call
// reads clearly instead of forcing a trip back here to check the order.
export async function create({ name, phone, email }) {
  const result = await pool.query(
    // Three columns, three placeholders. They have to match in count AND in
    // order: $1 takes the first array item, $2 the second, $3 the third.
    // Passing [email, name, phone] would store the email under name and
    // PostgreSQL would not complain — all three are text.
    //
    // RETURNING * here, unlike users, because no column in clients is
    // sensitive. users lists its columns one by one to leave password_hash
    // out. See src/services/users.js.
    'INSERT INTO clients (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
    [name, phone, email]
  );

  // rows is always an array, even for one row. [0] unwraps it so the caller
  // gets a client rather than a list containing one.
  return result.rows[0];
}