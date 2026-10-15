<!--
  Frame of every screen after login: top bar with the app name, the role-based menu,
  the current user and a logout button. On small screens the menu collapses behind a toggle.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/base/BaseButton.vue';
import { useAuth } from '@/composables/useAuth';
import { NAV_ITEMS } from './navigation';

const { user, hasRole, logout } = useAuth();
const router = useRouter();
const route = useRoute();
const menuOpen = ref(false);

const navItems = computed(() => NAV_ITEMS.filter((item) => item.roles.some(hasRole)));

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
);

function signOut(): void {
  logout();
  void router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-blue-950 text-white">
    <header class="border-b border-blue-800 bg-blue-900">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <RouterLink to="/" class="text-lg font-bold tracking-tight text-white">
          Vacation Manager
        </RouterLink>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-lg px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800 hover:text-white"
            exact-active-class="bg-blue-700 text-white"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="hidden items-center gap-3 md:flex">
          <div class="text-right leading-tight">
            <p class="text-sm font-medium">{{ user?.name }}</p>
            <p class="text-xs text-blue-300">{{ user?.roles.join(' + ') }}</p>
          </div>
          <BaseButton variant="secondary" size="sm" @click="signOut">Log out</BaseButton>
        </div>

        <button
          type="button"
          class="rounded-lg p-2 text-blue-100 hover:bg-blue-800 md:hidden"
          :aria-expanded="menuOpen"
          aria-label="Toggle menu"
          @click="menuOpen = !menuOpen"
        >
          ☰
        </button>
      </div>

      <div v-if="menuOpen" class="border-t border-blue-800 px-4 py-3 md:hidden">
        <nav class="flex flex-col gap-1" aria-label="Main">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-lg px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800"
            exact-active-class="bg-blue-700 text-white"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="mt-3 flex items-center justify-between border-t border-blue-800 pt-3">
          <p class="text-sm">
            {{ user?.name }} <span class="text-blue-300">({{ user?.roles.join(' + ') }})</span>
          </p>
          <BaseButton variant="secondary" size="sm" @click="signOut">Log out</BaseButton>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
