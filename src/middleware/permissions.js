// Permission checks that depend on the resource, not just the role.
//
// requireRole in src/middleware/auth.js answers "what kind of user is this?"
// and can run as middleware, because the answer is in the token.
//
// This file answers "may this user touch THIS ticket?", which needs the ticket
// itself. A middleware would have to fetch it, and the controllers already do.

import * as usersService from '../services/users.js';

// Can this user act on this ticket?
//
// Two rules, taken from how support actually works:
// - a supervisor can act on any ticket
// - an agent only on tickets in their own department
//
// Deliberately not about ownership. A ticket changes hands when a call drops,
// and whoever picks up the callback has to be able to work it. The department
// is the boundary that matters: a mobile agent has no business closing a
// washing-machine case, even though they can read it.
export async function canActOnTicket(user, ticket) {
  if (user.role === 'supervisor') {
    return true;
  }

  // Looked up rather than read from the token, for the same reason as
  // everywhere else: a reassignment should take effect now, not when the
  // token expires.
  const agent = await usersService.findById(user.id);

  return Boolean(agent) && agent.department_id === ticket.department_id;
}