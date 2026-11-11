import { Router } from 'express';
import { requireRole } from '../../middleware/authorization.js';
import { csrfProtection } from '../auth/auth.routes.js';
import { requestsController as controller } from './businessRequests.controller.v2.js';
import { dynamicIntakeLimiter } from './intakeLimiter.js';
import { registrationDocumentUpload } from './documentStorage.js';

const admin = Router();
admin.use(requireRole('SUPER_ADMIN'));
admin.get('/', controller.list);
admin.get('/export.csv', controller.csv);
admin.get('/:id/documents/:documentId', controller.downloadDocument);
admin.get('/:id', controller.get);
admin.patch('/:id/approve', csrfProtection, controller.approve);
admin.patch('/:id/reject', csrfProtection, controller.reject);
export { admin as businessRequestsAdminRoutes };

const intake = Router();
intake.get('/:id/status', controller.publicStatus);
intake.post('/', csrfProtection, dynamicIntakeLimiter, registrationDocumentUpload.single('document'), controller.intake);
export { intake as businessRequestsPublicRoutes };
