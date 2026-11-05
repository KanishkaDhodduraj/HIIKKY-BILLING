export function requireOwner(req, _res, next) {
  if (!req.session?.owner?.id) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
  if (req.session.owner.status !== 'ACTIVE') return next(Object.assign(new Error('Owner account is inactive'), { status: 401 }));
  return next();
}
