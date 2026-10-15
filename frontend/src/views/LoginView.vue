<!--
  Login screen. After logging in, users go back to the page they asked for, or to their home
  screen (requesters: new request form; validators: dashboard). Demo accounts can be filled in
  with one click.
-->
<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AlertMessage from '@/components/base/AlertMessage.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import { useAsyncAction } from '@/composables/useAsyncAction';
import { homeRouteFor, useAuth } from '@/composables/useAuth';

const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS = [
  { label: 'Requester', email: 'noa.levi@example.com' },
  { label: 'Validator', email: 'sarah.mizrahi@example.com' },
  { label: 'Both roles', email: 'david.benami@example.com' },
];

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const form = reactive({ email: '', password: '' });
const sessionExpired = computed(() => route.query.expired === '1');
const { run, loading, error } = useAsyncAction(login);

async function onSubmit(): Promise<void> {
  const user = await run(form.email.trim(), form.password);
  if (!user) {
    return;
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
  await router.push(redirect ?? homeRouteFor(user));
}

function useDemoAccount(email: string): void {
  form.email = email;
  form.password = DEMO_PASSWORD;
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-blue-950 px-4 py-10">
    <div class="w-full max-w-sm">
      <h1 class="mb-2 text-center text-2xl font-bold text-white">Vacation Manager</h1>
      <p class="mb-6 text-center text-sm text-blue-200">Log in to manage your vacations</p>

      <form
        class="space-y-4 rounded-xl border border-blue-800 bg-blue-900 p-6 shadow-lg"
        @submit.prevent="onSubmit"
      >
        <AlertMessage
          v-if="sessionExpired && !error"
          variant="info"
          message="Your session has expired. Please log in again."
        />
        <BaseInput
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="username"
          required
        />
        <BaseInput
          v-model="form.password"
          label="Password"
          type="password"
          autocomplete="current-password"
          required
        />
        <AlertMessage variant="error" :message="error" />
        <BaseButton type="submit" block :loading="loading">Log in</BaseButton>
      </form>

      <div class="mt-6 rounded-xl border border-blue-800 bg-blue-900/60 p-4">
        <p class="mb-3 text-xs font-semibold tracking-wide text-blue-300 uppercase">
          Demo accounts
        </p>
        <div class="flex flex-wrap gap-2">
          <BaseButton
            v-for="account in DEMO_ACCOUNTS"
            :key="account.email"
            variant="secondary"
            size="sm"
            @click="useDemoAccount(account.email)"
          >
            {{ account.label }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
