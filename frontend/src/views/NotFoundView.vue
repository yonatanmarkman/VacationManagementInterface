<!--
  Shown for any unknown address inside the app.
-->
<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue';
import BaseCard from '@/components/base/BaseCard.vue';
</script>

<template>
  <div class="mx-auto max-w-md">
    <BaseCard title="Page not found" subtitle="The page you are looking for does not exist.">
      <RouterLink v-slot="{ navigate }" to="/" custom>
        <BaseButton @click="navigate">Go to the home page</BaseButton>
      </RouterLink>
    </BaseCard>
  </div>
</template>
