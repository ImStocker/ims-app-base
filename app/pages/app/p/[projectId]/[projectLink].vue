<template>
  <project-root :project-id="projectId">
    <NuxtPage></NuxtPage>
  </project-root>
</template>
<script setup lang="ts">
import { definePageMeta } from '#imports';
import ProjectRoot from '#components/Project/ProjectRoot.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const projectId = route.params.projectId as string;

definePageMeta({
  meta: {
    guest: true,
  },
  layout: 'project-layout',
  middleware: 'check-project-exists',
});
</script>
