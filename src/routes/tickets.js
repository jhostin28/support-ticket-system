// Ticket routes.
//
// Same structure as src/routes/clients.js. Every route requires a token, and
// here it is not only about protecting data: the controller reads req.user.id
// to set the author and resolve the department. Without requireAuth there
// would be no req.user at all and the controller would crash.

import { Router } from 'express';

import * as ticketsController from '../controllers/tickets.js';
import * as commentsController from '../controllers/comments.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, ticketsController.list);
router.get('/:id', requireAuth, ticketsController.getOne);
router.post('/', requireAuth, ticketsController.create);
router.patch('/:id', requireAuth, ticketsController.update);

// Comments are a nested resource: they belong to a ticket, so they hang off
// this router rather than having a top-level /api/comments. A comment with no
// ticket makes no sense.
//
// Mounted at /api/tickets, these answer /api/tickets/:ticketId/comments.
//
// The parameter is named :ticketId and not :id so the comment controller reads
// clearly — req.params.ticketId says what it holds.
router.get('/:ticketId/comments', requireAuth, commentsController.list);
router.post('/:ticketId/comments', requireAuth, commentsController.create);
// Not CRUD: a business action, so the URL carries a verb.
router.post('/:id/escalate', requireAuth, ticketsController.escalate);

export default router;