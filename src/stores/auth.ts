import { create } from 'zustand';
import type { User } from '@/types/api';

interface AuthState {
  jwt: string | null;
  user: User | null;
  setAuth: (jwt: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: localStorage.getItem('jwt'),
  user: null,
  setAuth: (jwt, user) => {
    localStorage.setItem('jwt', jwt);
    set({ jwt, user });
  },
  clearAuth: () => {
    localStorage.removeItem('jwt');
    set({ jwt: null, user: null });
  },
}));
