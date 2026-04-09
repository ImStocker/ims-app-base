<template>
  <div class="ChatBlockLikeButton use-buttons-rounded">
    <form-check-smile
      v-if="!smileIsBusy"
      :selected-likes-dict="selectedEmojis"
      @input="changeMyLike($event)"
      @dropdown-state-change="$emit('dropdown-state-change', $event)"
    ></form-check-smile>
    <button v-else class="is-button loading"></button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import FormCheckSmile from '../../../../app/components/Form/FormCheckSmile.vue';

export default defineComponent({
  name: 'ChatBlockLikeButton',
  components: {
    FormCheckSmile,
  },
  props: {
    selectedEmojis: {
      type: Object as PropType<{ [like: string]: boolean }>,
      default: () => ({}),
    },
  },
  emits: ['like', 'dropdown-state-change'],
  data() {
    return {
      smileIsBusy: false,
    };
  },
  methods: {
    changeMyLike(emoji: string) {
      this.$emit('like', emoji);
    },
  },
});
</script>
<style lang="scss" scoped>
.ChatBlockLikeButton {
  :deep(.is-button) {
    --button-bg-color: var(--local-bg-color);
  }
}
</style>
