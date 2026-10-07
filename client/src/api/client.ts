import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

if (!apiUrl) {
  throw new Error('VITE_API_URL must be set to the backend API origin.');
}

const apiBaseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('delivery-agent-access-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
