import axios from 'axios';
import { clearUser } from '@/lib/auth';

// Usamos /api como base pois o next.config.ts faz o rewrite para a URL da API
const instance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para tratar erros de forma global se necessário
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Aqui tratamos 401 para deslogar o usuário
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        clearUser();
        // Redireciona para login e impede loop infinito se já estiver lá
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
