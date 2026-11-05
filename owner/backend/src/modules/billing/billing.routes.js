import { Router } from 'express';
import { billingController as controller } from './billing.controller.js';

const router = Router();
router.get('/export.csv', controller.csv);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.patch('/:id/paid', controller.paid);
router.post('/:id/notify', controller.notify);
export default router;
