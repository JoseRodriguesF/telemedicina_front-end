import axios from 'axios';

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
    // Aqui poderíamos tratar 401 para deslogar o usuário
    return Promise.reject(error);
  }
);

export default instance;
