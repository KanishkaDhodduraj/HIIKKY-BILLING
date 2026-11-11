export function apiResponse(res, { status = 200, message = 'Success', data = null, fieldErrors = null } = {}) {
  return res.status(status).json({ success: true, message, data, timestamp: new Date().toISOString(), fieldErrors });
}

export function apiError(res, { status = 400, message = 'Request failed', fieldErrors = null } = {}) {
  return res.status(status).json({ success: false, message, data: null, timestamp: new Date().toISOString(), fieldErrors });
}
