import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, dataOf, setCsrfToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((response) => { if (active) setUser(dataOf(response)); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const csrf = await api.get('/auth/csrf');
      setCsrfToken(dataOf(csrf)?.token);
      const response = await api.post('/auth/login', credentials);
      const data = dataOf(response);
      setCsrfToken(data?.csrfToken);
      setUser(data);
      return data;
    },
    async logout() {
      try { await api.post('/auth/logout'); }
      finally { setCsrfToken(''); setUser(null); }
    },
    setUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
