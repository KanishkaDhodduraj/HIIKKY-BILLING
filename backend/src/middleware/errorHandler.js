import { apiError } from '../utils/apiResponse.js';
export function notFound(_req, res) { return apiError(res, { status: 404, message: 'Resource not found' }); }
export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error?.name === 'ZodError') { const fieldErrors = Object.fromEntries(error.issues.map((i) => [i.path.join('.') || 'request', i.message])); return apiError(res, { status: 400, message: 'Validation failed', fieldErrors }); }
  if (error?.code === 11000) return apiError(res, { status: 409, message: 'A record with that value already exists' });
  const status = Number.isInteger(error?.status) ? error.status : 500;
  return apiError(res, { status, message: status === 500 ? 'An unexpected error occurred' : error.message, fieldErrors: error.fieldErrors || null });
}
