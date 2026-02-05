<template>
  <NuxtPage></NuxtPage>
</template>
<script setup lang="ts">
import { definePageMeta } from '#imports';

definePageMeta({
  meta: {
    guest: true,
  },
  layout: 'project-layout',
  middleware: 'check-project-exists',
});
</script>
