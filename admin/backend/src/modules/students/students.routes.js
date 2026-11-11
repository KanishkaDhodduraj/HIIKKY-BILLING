import { Router } from 'express';
import { requireRole } from '../../middleware/authorization.js';
import { csrfProtection } from '../auth/auth.routes.js';
import { studentsController as controller } from './students.controller.js';

const router = Router();
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));
router.get('/export.csv', controller.csv);
router.get('/payments/export.csv', controller.paymentsCsv);
router.get('/payments', controller.payments);
router.get('/', controller.list);
router.patch('/:id/block', csrfProtection, controller.block);
router.patch('/:id/unblock', csrfProtection, controller.unblock);
export default router;
