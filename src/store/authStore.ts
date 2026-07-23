import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '../lib/api';
import { Role, UserProfile } from '../types/models';

const SESSION_KEY = 'civ_session_token';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (
    role: Role,
    identifier: string,
    pin: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  isAuthenticated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const { profile } = await api.get<{ profile: UserProfile }>('/auth/me', token);
      set({ user: profile, token, isAuthenticated: true, hydrated: true });
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      set({ user: null, token: null, isAuthenticated: false, hydrated: true });
    }
  },

  login: async (role, identifier, pin) => {
    try {
      const { token, profile } = await api.post<{ token: string; profile: UserProfile }>(
        '/auth/login',
        { role, identifier, pin }
      );
      await SecureStore.setItemAsync(SESSION_KEY, token);
      set({ user: profile, token, isAuthenticated: true });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Login gagal, coba lagi.',
      };
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
}));
