<!--
  Root component: public pages (login) render on their own; every other page renders inside
  the application layout.
-->
<script setup lang="ts">
import { useRoute } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';

const route = useRoute();
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
