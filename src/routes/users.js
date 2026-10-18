// User routes.
//
// Same structure as src/routes/departments.js. Creating users is restricted to
// supervisors: without that, any agent could create an account with
// role 'supervisor' and promote themselves.

import { Router } from 'express';

import * as usersController from '../controllers/users.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Middleware runs left to right: requireAuth sets req.user, then requireRole
// reads it. The order is not optional.
router.post('/', requireAuth, requireRole('supervisor'), usersController.create);

export default router;