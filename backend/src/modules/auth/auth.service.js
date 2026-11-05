import bcrypt from 'bcrypt';
import { timingSafeEqual } from 'node:crypto';
import AdminAccount from '../../models/AdminAccount.js';
import AdminSetting from '../../models/AdminSetting.js';
export const safeAccount = (a) => ({ id: String(a._id), email: a.email, role: a.role, enabled: a.enabled, ...(a.createdAt ? { createdAt: a.createdAt, updatedAt: a.updatedAt } : {}) });
export const authService = {
  async login(email, password) { const account = await AdminAccount.findOne({ email: email.toLowerCase() }).select('+passwordHash'); if (!account || !account.enabled || !(await bcrypt.compare(password, account.passwordHash))) return null; return account; },
  async bootstrap(email, password, suppliedSecret, configuredSecret) {
    if (!configuredSecret || configuredSecret.length < 32) { const e = new Error('Bootstrap is not configured'); e.status = 403; throw e; }
    const left = Buffer.from(suppliedSecret || ''), right = Buffer.from(configuredSecret);
    if (left.length !== right.length || !timingSafeEqual(left, right)) { const e = new Error('Invalid bootstrap secret'); e.status = 403; throw e; }
    const session = await AdminAccount.startSession();
    try { let created; await session.withTransaction(async () => { if (await AdminAccount.exists({}).session(session) || await AdminSetting.exists({ key: 'first-super-admin-initialized' }).session(session)) { const e = new Error('An admin account already exists'); e.status = 409; throw e; } await AdminSetting.create([{ key: 'first-super-admin-initialized' }], { session }); [created] = await AdminAccount.create([{ email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role: 'SUPER_ADMIN', enabled: true }], { session }); }); return created; } finally { await session.endSession(); }
  },
};
