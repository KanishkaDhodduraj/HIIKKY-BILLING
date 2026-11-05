import AdminSetting from '../../models/AdminSetting.js';
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();
export async function dynamicIntakeLimiter(req, res, next) {
  try {
    const setting = await AdminSetting.findOne({ key: 'public-registration-rate-limit' }).select('maxSubmissions');
    const limit = setting?.maxSubmissions ?? 10, now = Date.now(), key = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = attempts.get(key);
    if (!entry || now >= entry.resetAt) entry = { count: 0, resetAt: now + WINDOW_MS };
    entry.count += 1; attempts.set(key, entry);
    if (attempts.size > 10000) for (const [ip, hit] of attempts) if (now >= hit.resetAt) attempts.delete(ip);
    res.set('RateLimit-Limit', String(limit)); res.set('RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    if (entry.count > limit) return res.status(429).json({ success: false, message: 'Too many registration submissions', data: null, timestamp: new Date().toISOString(), fieldErrors: null });
    return next();
  } catch (error) { return next(error); }
}
