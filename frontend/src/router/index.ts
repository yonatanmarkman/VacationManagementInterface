/**
 * Routes of the single-page app and the navigation guard that protects them.
 *
 * Every route except /login requires a session. Routes with `meta.roles` are only open
 * to users holding one of those roles; others are sent to their own home screen.
 * The backend enforces the same rules; the guard only keeps the UI consistent.
 */
import { createRouter, createWebHistory } from 'vue-router';
import type { UserRole } from '@/types/api';
import { homeRouteFor, isSessionValid, useAuth } from '@/composables/useAuth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title shown in the browser tab. */
    title?: string;
    /** True for pages reachable without logging in. */
    public?: boolean;
    /** Roles allowed on the page (any of them). */
    roles?: UserRole[];
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Log in', public: true },
    },
    {
      path: '/',
      redirect: () => homeRouteFor(useAuth().user.value),
    },
    {
      path: '/requests/new',
      component: () => import('@/views/NewRequestView.vue'),
      meta: { title: 'New request', roles: ['Requester'] },
    },
    {
      path: '/requests',
      component: () => import('@/views/MyRequestsView.vue'),
      meta: { title: 'My requests', roles: ['Requester'] },
    },
    {
      path: '/dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: 'Dashboard', roles: ['Validator'] },
    },
    {
      path: '/team/calendar',
      component: () => import('@/views/TeamCalendarView.vue'),
      meta: { title: 'Team calendar' },
    },
    {
      path: '/team/plan',
      component: () => import('@/views/TeamPlanView.vue'),
      meta: { title: 'Plan team vacation', roles: ['Requester'] },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Page not found' },
    },
  ],
});

router.beforeEach((to) => {
  const { user, hasRole } = useAuth();
  const loggedIn = isSessionValid();

  if (to.meta.public) {
    return loggedIn && to.path === '/login' ? homeRouteFor(user.value) : true;
  }
  if (!loggedIn) {
    return { path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
  }
  if (to.meta.roles && !to.meta.roles.some(hasRole)) {
    return homeRouteFor(user.value);
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Vacation Manager` : 'Vacation Manager';
});
