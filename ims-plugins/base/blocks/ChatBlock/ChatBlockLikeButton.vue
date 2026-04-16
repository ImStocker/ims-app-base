<template>
  <form-select-emoji
    :selected-emojis="selectedEmojis"
    @dropdown-state-change="$emit('dropdown-state-change', $event)"
    @select="$emit('like', $event)"
  ></form-select-emoji>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import FormSelectEmoji from '../../../../app/components/Form/FormSelectEmoji.vue';

export default defineComponent({
  name: 'ChatBlockLikeButton',
  components: {
    FormSelectEmoji,
  },
  props: {
    selectedEmojis: {
      type: Set,
      default: null,
    },
  },
  emits: ['like', 'dropdown-state-change'],
});
</script>
<style lang="scss" scoped>
.ChatBlockLikeButton {
  :deep(.is-button) {
    --button-bg-color: var(--local-bg-color);
  }
}
</style>
