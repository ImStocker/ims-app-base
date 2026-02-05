<template>
  <div :id="asset.id_asset" class="FormEditorElement">
    {{ asset.title }}
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FormEditorElement',
  props: {
    asset: { type: Object, default: () => {} },
  },
});
</script>
