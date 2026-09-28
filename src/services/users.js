// User service.
//
// Agents and supervisors who work in the system. Clients do not log in — they
// call, and an agent creates the ticket for them — so only users have a
// password.

import bcrypt from 'bcrypt';
import pool from '../db.js';

// How much work bcrypt does per hash. Each extra round doubles the time:
// 10 is around 100ms, 12 around 400ms.
//
// Slowness is the point. Fast hashes like MD5 or SHA-256 let an attacker with
// a stolen database try millions of guesses per second. At 100ms per attempt
// that becomes impractical, while a user logging in never notices.
const SALT_ROUNDS = 10;

// Create one user.
//
// The plain password comes in here and is hashed inside this function, on
// purpose. Hashing in the controller instead would mean every future caller —
// a CSV import script, a seed file — has to remember to hash first, and
// forgetting once stores a plain password. Here it is impossible to get wrong.
//
// The parameter is a single object rather than five positional arguments, so
// the call reads clearly. create('Ana', 'a@x.com', 'pw', 'agent', 1) would
// force a trip back to this file to check the order.
export async function create({ name, email, password, role, departmentId }) {
  // bcrypt also generates a random salt per password, so two users with the
  // same password end up with different hashes and nobody can tell they match.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    // Backticks allow the SQL to span several lines.
    //
    // The returned columns are listed one by one instead of RETURNING *,
    // specifically to leave password_hash out. It is only a hash, but there is
    // no reason for it to travel further than this function — anything not
    // needed is not exposed.
    `INSERT INTO users (name, email, password_hash, role, department_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, department_id, is_active, created_at`,
    [name, email, passwordHash, role, departmentId]
  );

  return result.rows[0];
}

// Find one user by email, for login.
//
// SELECT * here, even though create() deliberately leaves password_hash out.
// The difference is where the data goes: this result never reaches the client.
// The controller needs the hash to compare it against the submitted password —
// without it there is nothing to verify against.
//
// If no user has that email, rows is empty and rows[0] is undefined. That is
// not an error, it is a valid answer: not found. The controller decides what
// to do with it.
export async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}