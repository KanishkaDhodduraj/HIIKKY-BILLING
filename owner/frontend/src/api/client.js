import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api', withCredentials: true });
export const adminApi = axios.create({ baseURL: import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5000/api', withCredentials: true });
let csrfToken = '';
export const setCsrfToken = (token) => { csrfToken = token || ''; };
export const dataOf = (response) => response?.data?.data;

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    if (!csrfToken && !config.url?.includes('/auth/csrf')) {
      const token = await api.get('/owner/auth/csrf');
      csrfToken = token.data.data.token;
    }
    if (csrfToken) config.headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return config;
});
api.interceptors.response.use((response) => response, async (error) => {
  if (error.response?.status === 403 && error.config && !error.config.__csrfRetried && !error.config.url?.includes('/auth/csrf')) {
    csrfToken = '';
    error.config.__csrfRetried = true;
    const token = await api.get('/owner/auth/csrf');
    csrfToken = token.data.data.token;
    error.config.headers['X-CSRF-TOKEN'] = csrfToken;
    return api.request(error.config);
  }
  return Promise.reject(error);
});
