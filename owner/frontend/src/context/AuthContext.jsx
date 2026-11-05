import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, dataOf, setCsrfToken } from '../api/client';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [otpPending, setOtpPending] = useState(null);
  useEffect(() => { let alive = true; api.get('/owner/auth/me').then((response) => { if (alive) setUser(dataOf(response)); }).catch(() => { if (alive) setUser(null); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const value = useMemo(() => ({
    user, loading, otpPending,
    async login(credentials) {
      const csrf = await api.get('/owner/auth/csrf'); setCsrfToken(dataOf(csrf)?.token);
      const result = await api.post('/owner/auth/login', credentials);
      const data = dataOf(result); setCsrfToken(data?.csrfToken);
      if (data?.requiresOtp) { setOtpPending({ email: data.email }); return { requiresOtp: true }; }
      setUser(data); return { requiresOtp: false };
    },
    async verifyOtp(code) { const result = await api.post('/owner/auth/verify-otp', { code }); const data = dataOf(result); setCsrfToken(data?.csrfToken); setUser(data); setOtpPending(null); return data; },
    async logout() { try { await api.post('/owner/auth/logout'); } finally { setCsrfToken(''); setOtpPending(null); setUser(null); } },
    setUser,
  }), [user, loading, otpPending]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
