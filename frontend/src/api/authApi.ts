/**
 * Authentication endpoints.
 */
import type { LoginResult, User } from '@/types/api';
import { http } from './http';

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    return (await http.post<LoginResult>('/auth/login', { email, password })).data;
  },

  async me(): Promise<User> {
    return (await http.get<User>('/auth/me')).data;
  },
};
