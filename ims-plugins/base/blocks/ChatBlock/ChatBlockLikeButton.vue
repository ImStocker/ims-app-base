<template>
  <div class="ChatBlockLikeButton use-buttons-rounded">
    <form-check-smile
      v-if="!smileIsBusy"
      :selected-likes-dict="selectedEmojis"
      @input="changeMyLike($event)"
      @change-dropdown-state="$emit('change-dropdown-state', $event)"
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
  emits: ['like', 'change-dropdown-state'],
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
