/**
 * Application entry point: creates the Vue app, installs the router and connects the
 * HTTP client to the session (an expired or invalid token sends the user back to login).
 */
import { createApp } from 'vue';
import { setUnauthorizedHandler } from '@/api/http';
import { useAuth } from '@/composables/useAuth';
import { router } from '@/router';
import App from './App.vue';
import './style.css';

setUnauthorizedHandler(() => {
  useAuth().logout();
  const redirect = router.currentRoute.value.fullPath;
  void router.push({ path: '/login', query: { redirect, expired: '1' } });
});

createApp(App).use(router).mount('#app');
