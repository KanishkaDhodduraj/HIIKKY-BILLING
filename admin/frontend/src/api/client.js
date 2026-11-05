import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api',withCredentials:true});
let csrfToken;
api.interceptors.request.use(async config=>{if(!['get','head','options'].includes((config.method||'get').toLowerCase())){if(!csrfToken){const r=await api.get('/admin/auth/csrf');csrfToken=r.data.data.token;}config.headers['X-CSRF-TOKEN']=csrfToken;}return config;});
api.interceptors.response.use(r=>r,async error=>{if(error.response?.status===403&&error.config&&!error.config.__csrfRetried){csrfToken=undefined;error.config.__csrfRetried=true;const token=await api.get('/admin/auth/csrf');csrfToken=token.data.data.token;error.config.headers['X-CSRF-TOKEN']=csrfToken;return api.request(error.config);}return Promise.reject(error);});
export const dataOf=r=>r.data.data;
