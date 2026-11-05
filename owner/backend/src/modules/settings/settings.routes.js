import { Router } from 'express';
import { settingsController as controller } from './settings.controller.js';

const router = Router();
router.get('/', controller.get);
router.put('/profile', controller.profile);
router.put('/gateways/:provider', controller.gateway);
router.post('/gateways/:provider/test', controller.testGateway);
router.put('/email', controller.email);
router.post('/email/test', controller.testEmail);
router.put('/security', controller.security);
router.post('/security/master-key', controller.rotateApiKey);
export default router;
