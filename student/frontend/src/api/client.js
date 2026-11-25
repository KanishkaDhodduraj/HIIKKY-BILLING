import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/student',
  withCredentials: true,
});

export const dataOf = (response) => response?.data?.data;
let csrfToken = '';
export const setCsrfToken = (token) => { csrfToken = token || ''; };

async function refreshCsrf() {
  const response = await api.get('/auth/csrf');
  csrfToken = dataOf(response)?.token || '';
  return csrfToken;
}

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    if (!csrfToken && !config.url?.includes('/auth/csrf')) await refreshCsrf();
    if (csrfToken) config.headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
    window.dispatchEvent(new CustomEvent('student-password-change-required'));
    return Promise.reject(error);
  }
  if (error.response?.status === 403 && config && !config.__csrfRetried && !config.url?.includes('/auth/csrf')) {
    config.__csrfRetried = true;
    await refreshCsrf();
    config.headers['X-CSRF-TOKEN'] = csrfToken;
    return api.request(config);
  }
  return Promise.reject(error);
});
