<template>
  <div class="is-panel">
    <div class="is-panel-inner"><slot></slot></div>
  </div>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'IsPanel',
});
</script>
