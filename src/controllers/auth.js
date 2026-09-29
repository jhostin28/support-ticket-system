// Auth controller.
//
// Same shape as the other controllers (see src/controllers/users.js), with one
// difference worth noting: the error message is deliberately vague.

import * as authService from '../services/auth.js';

// POST /auth/login — verify credentials and hand back a token.
export async function login(req, res) {
    // || {} guards against a request with no body at all. Without it,
    // destructuring undefined throws before the validation below ever runs, and
    // the client gets a 500 instead of a clear 400.
   const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await authService.login(email, password);

    // The service returns null whether the email is unknown or the password is
    // wrong, and this responds the same way to both. Saying which one failed
    // would let an attacker map out which accounts exist — user enumeration.
    //
    // 401 Unauthorized, not 403: the caller is not identified at all. 403 is
    // for someone who IS identified but is not allowed to do this.
    if (!result) {
      return res.status(401).json({ error: 'invalid email or password' });
    }

    // 200, not 201: nothing was created. A token was issued.
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
}