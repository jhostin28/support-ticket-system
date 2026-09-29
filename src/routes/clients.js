// Client routes.
//
// Same structure as src/routes/departments.js, with one difference: both
// routes require a token, not just the write.
//
// Departments are a list of internal queue names — harmless to read. Clients
// are real people's names, phone numbers and emails, so listing them without
// authenticating would expose personal data to anyone who finds the URL.

import { Router } from 'express';

import * as clientsController from '../controllers/clients.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, clientsController.list);
router.post('/', requireAuth, clientsController.create);

export default router;