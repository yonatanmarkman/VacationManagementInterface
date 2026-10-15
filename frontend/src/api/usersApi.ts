/**
 * User directory endpoint (validators only).
 */
import type { PageParams, Paginated, User } from '@/types/api';
import { http } from './http';

export const usersApi = {
  async list(page: PageParams): Promise<Paginated<User>> {
    return (await http.get<Paginated<User>>('/users', { params: page })).data;
  },
};
