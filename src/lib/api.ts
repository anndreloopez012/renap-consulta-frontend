import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-info.gts-guatemala.com';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const jwt = useAuthStore.getState().jwt;
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast({
        title: 'Error de conexión',
        description: 'Verifica tu red.',
        variant: 'destructive',
      });
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    } else if (status === 403) {
      toast({
        title: 'Acceso denegado',
        description: 'No tienes permisos para realizar esta acción.',
        variant: 'destructive',
      });
    } else if (status === 404) {
      toast({
        title: 'No encontrado',
        description: 'El recurso solicitado no existe.',
        variant: 'destructive',
      });
    } else if (status >= 500) {
      toast({
        title: 'Error del servidor',
        description: 'Intenta más tarde.',
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
