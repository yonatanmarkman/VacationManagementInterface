/**
 * Menu entries of the combined interface. Each entry is shown only to users holding
 * one of its roles; a user with both roles sees every entry.
 */
import type { UserRole } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'New request', to: '/requests/new', roles: ['Requester'] },
  { label: 'My requests', to: '/requests', roles: ['Requester'] },
  { label: 'Dashboard', to: '/dashboard', roles: ['Validator'] },
  { label: 'Team calendar', to: '/team/calendar', roles: ['Requester', 'Validator'] },
  { label: 'Plan team vacation', to: '/team/plan', roles: ['Requester'] },
];
