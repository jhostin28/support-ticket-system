// Ticket routes.
//
// Same structure as src/routes/clients.js. Every route requires a token, and
// here it is not only about protecting data: the controller reads req.user.id
// to set the author and resolve the department. Without requireAuth there
// would be no req.user at all and the controller would crash.

import { Router } from 'express';

import * as ticketsController from '../controllers/tickets.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, ticketsController.list);
router.post('/', requireAuth, ticketsController.create);

export default router;