import OwnerSetting from '../models/OwnerSetting.js';
import BusinessOwner from '../models/BusinessOwner.js';

export async function requireOwner(req, _res, next) {
  if (!req.session?.owner?.id) return next(Object.assign(new Error('Authentication required'), { status: 401 }));
  if (req.session.owner.status !== 'ACTIVE') return next(Object.assign(new Error('Owner account is inactive'), { status: 401 }));
  req.owner = req.session.owner;
  req.ownerOrganizationIds = Array.isArray(req.session.owner.organizationIds) ? req.session.owner.organizationIds : [];
  try {
    const account = await BusinessOwner.findById(req.owner.id).select('status');
    if (!account || account.status !== 'ACTIVE') {
      await new Promise((resolve) => req.session.destroy(() => resolve()));
      return next(Object.assign(new Error('Owner account is inactive'), { status: 401 }));
    }
    if (req.ownerOrganizationIds[0]) {
      const setting = await OwnerSetting.findOne({ organizationId: req.ownerOrganizationIds[0] });
      if (setting?.security?.ipWhitelistEnabled && !setting.security.allowedIPs.includes(req.ip)) return next(Object.assign(new Error('This IP address is not allowed'), { status: 403 }));
      if (setting?.security?.autoLogoutMinutes) req.session.cookie.maxAge = setting.security.autoLogoutMinutes * 60 * 1000;
    }
    return next();
  } catch (error) { return next(error); }
}
