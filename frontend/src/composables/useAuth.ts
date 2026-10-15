/**
 * Session state shared by the whole app: the logged-in user and their access token.
 *
 * The session is kept in localStorage so a page refresh does not log the user out;
 * it is discarded when it expires or when the user logs out.
 */
import { computed, reactive, readonly } from 'vue';
import { authApi } from '@/api/authApi';
import { setAccessToken } from '@/api/http';
import type { User, UserRole } from '@/types/api';

interface Session {
  token: string;
  user: User;
  /** Epoch milliseconds after which the token is no longer valid. */
  expiresAt: number;
}

const STORAGE_KEY = 'vacation-manager.session';

function loadSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
    return session && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

const state = reactive<{ session: Session | null }>({ session: loadSession() });
setAccessToken(state.session?.token ?? null);

function saveSession(session: Session | null): void {
  state.session = session;
  setAccessToken(session?.token ?? null);
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** True while a stored session exists and has not expired. */
export function isSessionValid(): boolean {
  if (state.session && state.session.expiresAt <= Date.now()) {
    saveSession(null);
  }
  return state.session !== null;
}

export function useAuth() {
  const user = computed(() => state.session?.user ?? null);

  function hasRole(role: UserRole): boolean {
    return user.value?.roles.includes(role) ?? false;
  }

  async function login(email: string, password: string): Promise<User> {
    const result = await authApi.login(email, password);
    saveSession({
      token: result.accessToken,
      user: result.user,
      expiresAt: Date.now() + result.expiresIn * 1000,
    });
    return result.user;
  }

  function logout(): void {
    saveSession(null);
  }

  return {
    state: readonly(state),
    user,
    isRequester: computed(() => hasRole('Requester')),
    isValidator: computed(() => hasRole('Validator')),
    hasRole,
    login,
    logout,
  };
}

/** The screen a user lands on after logging in. */
export function homeRouteFor(user: User | null): string {
  if (!user) {
    return '/login';
  }
  return user.roles.includes('Requester') ? '/requests/new' : '/dashboard';
}
