import { Router } from 'express';
import { dashboardController as controller } from './dashboard.controller.js';

const router = Router();
router.get('/', controller.get);
router.get('/revenue', controller.revenue);
router.get('/subscriptions', controller.subscriptions);
export default router;
