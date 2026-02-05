<template>
  <div></div>
</template>
<script setup lang="ts">
import { definePageMeta } from '#imports';
definePageMeta({
  name: 'project-workspace-by-name',
  middleware: 'redirect-workspace-from-name-to-id',
});
</script>
