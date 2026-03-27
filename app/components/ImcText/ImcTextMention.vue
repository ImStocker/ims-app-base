<template>
  <span class="ImcTextMention">@{{ name }}</span>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ImcTextMention',
  props: {
    accountId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    id: {
      type: String,
      default: null,
    },
  },
});
</script>
