// Authentication middleware.
//
// Sits in front of protected endpoints: reads the token, verifies it, and
// either lets the request through or stops it with a 401. The controller
// behind it never runs on an unauthenticated request.
//
// This is the same kind of function as express.json() in src/server.js —
// something every protected route needs, written once instead of repeated in
// each controller.

import jwt from 'jsonwebtoken';

// The third parameter, next, is what makes this middleware rather than a
// controller. Calling it means "all good, carry on to whatever comes next".
// Not calling it stops the request here.
export function requireAuth(req, res, next) {
  // The token travels in the Authorization header, not in the body or the URL.
  // It is not part of the request's data — it is information about WHO is
  // making the request — and a header works the same on a GET, which has no
  // body at all.
  //
  // The expected format is: Authorization: Bearer <token>
  // "Bearer" means exactly that: whoever carries this is treated as its owner.
  // It is a standard, which is why every HTTP tool understands it.
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'authentication required' });
  }

  // Split on the space and take the second half: "Bearer abc123" → "abc123".
  const token = authHeader.split(' ')[1];

  try {
    // verify() checks two things: that the signature matches this server's
    // secret, so the payload was not tampered with, and that the token has not
    // expired. Either failure throws, which is why this is wrapped in try.
    //
    // Note what it does NOT do: hit the database. Everything needed is inside
    // the token, which is what makes a REST API stateless.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // The point of the whole middleware: attach the caller's identity to the
    // request before passing it on. From here, any controller can read
    // req.user.id and req.user.role without doing any work.
    //
    // This matters for more than convenience. When a comment gets created, its
    // user_id comes from req.user.id — never from the request body. If the
    // client supplied it, anyone could post comments as someone else.
    req.user = { id: payload.userId, role: payload.role };

    // Hand the request on to the controller.
    next();
  } catch (err) {
    // Invalid signature, malformed token, or expired — all 401. The message
    // stays vague on purpose: naming which one failed tells an attacker what
    // to adjust.
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Require a specific role.
//
// A factory: it does not check anything itself, it returns a middleware that
// does. That is what lets the role be named at the route:
//   router.post('/', requireAuth, requireRole('supervisor'), controller.create)
//
// Without this shape, a separate middleware per role would be needed.
//
// It assumes requireAuth ran first and set req.user — which is why order
// matters in the route.
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      // 403, not 401. The caller IS identified — the token was valid and
      // requireAuth let them through. They simply are not allowed to do this.
      // 401 would mean "log in", which would not help here.
      return res.status(403).json({ error: 'this action requires a supervisor' });
    }

    next();
  };
}