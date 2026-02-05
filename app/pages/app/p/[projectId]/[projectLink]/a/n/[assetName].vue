<template>
  <div></div>
</template>
<script setup lang="ts">
import { definePageMeta } from '#imports';

definePageMeta({
  name: 'project-asset-by-name',
  middleware: 'redirect-asset-from-name-to-id',
});
</script>
