// Auth service.
//
// Different from the other services: it never touches the database directly.
// It leans on src/services/users.js for that and handles what is specific to
// authentication — checking a password and issuing a token.

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as usersService from './users.js';

// Verify credentials and return a token, or null if they do not check out.
export async function login(email, password) {
  // findByEmail uses SELECT * precisely so password_hash comes back — there
  // would be nothing to compare against otherwise. See src/services/users.js.
  const user = await usersService.findByEmail(email);

  // No user with that email. rows[0] came back undefined, which is not an
  // error — just an answer.
  if (!user) {
    return null;
  }

  // compare() does not decrypt anything: hashing is one-way. It runs the
  // submitted password through the same process and checks whether the two
  // hashes match, returning true or false.
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  // Both failures above return the same null, on purpose.
  //
  // Answering "that email does not exist" versus "wrong password" would let an
  // attacker discover which accounts are real — user enumeration. Trying
  // addresses one by one, "wrong password" confirms a hit and halves the work.
  // The controller can only see null, so it cannot leak which one failed.
  //
  // The cost is real: a legitimate user who mistypes does not learn which
  // field was wrong. Every serious system accepts that trade.

  // sign() takes what to put inside the token, the secret to sign it with,
  // and the options.
  //
  // What goes in the payload is the minimum: id and role, enough to know who
  // is calling and what they may do, without another database round trip.
  //
  // What does NOT go in: the password, the hash, the email. A JWT's contents
  // can be read by anyone without the key — the signature prevents tampering,
  // not reading. Paste a token into jwt.io and the payload is right there.
  //
  // The secret lives in .env. It is what makes a token forgeable or not: with
  // it, anyone could issue a token claiming role: supervisor.
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return { token };
}