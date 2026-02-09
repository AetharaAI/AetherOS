import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AuthState, User } from '@/types/chat';

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void;
  setGuestId: (id: string) => void;
  clearAuth: () => void;
  getEffectiveUserId: () => string;
  getUserSubClaim: () => string | null;
  getAccessToken: () => string | null;
  getIdToken: () => string | null;
}

const generateGuestId = () => `guest-${uuidv4()}`;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const payload = JSON.parse(decoded);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractSubFromToken(token?: string): string | null {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const sub = payload.sub;
  return typeof sub === 'string' && sub.trim().length > 0 ? sub : null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isAnonymous: true,
      guestId: generateGuestId(),

      // Actions
      setUser: (user) => {
        const tokenSub = extractSubFromToken(user?.accessToken) ?? extractSubFromToken(user?.idToken);
        const normalizedUser = user
          ? {
              ...user,
              id: tokenSub ?? user.id,
            }
          : null;

        set({
          user: normalizedUser,
          isAuthenticated: !!normalizedUser,
          isAnonymous: !normalizedUser,
        });
      },

      setGuestId: (id) => set({ guestId: id }),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          isAnonymous: true,
          guestId: generateGuestId(),
        }),

      getEffectiveUserId: () => {
        const { user, guestId } = get();
        const tokenSub = extractSubFromToken(user?.accessToken) ?? extractSubFromToken(user?.idToken);
        return tokenSub ?? user?.id ?? guestId;
      },

      getUserSubClaim: () => {
        const { user } = get();
        return extractSubFromToken(user?.accessToken);
      },

      getAccessToken: () => {
        const { user } = get();
        return user?.accessToken ?? null;
      },

      getIdToken: () => {
        const { user } = get();
        return user?.idToken ?? null;
      },
    }),
    {
      name: 'aetheros-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAnonymous: state.isAnonymous,
        guestId: state.guestId,
      }),
    }
  )
);
