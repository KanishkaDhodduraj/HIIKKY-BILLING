import { Router } from 'express';
import { notificationsController as controller } from './notifications.controller.js';

const router = Router();
router.get('/export.csv', controller.csv);
router.get('/', controller.list);
router.post('/', controller.dispatch);
export default router;
