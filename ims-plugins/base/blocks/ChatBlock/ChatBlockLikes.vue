<template>
  <div class="ChatBlockLikes use-buttons-rounded">
    <button
      v-for="emoji of messageLikes"
      :key="emoji"
      :class="{
        'my-like': emojiSelectedByCurrentUser(emoji),
      }"
      class="is-button ChatBlockLikes-like"
      :disabled="readonly"
      @click="changeMyLike(emoji)"
    >
      <div class="ChatBlockLikes-like-content">
        <div
          class="ChatBlockLikes-like-content-emoji"
          :class="{
            [`type-${emoji.toLowerCase()}`]: true,
          }"
        >
          {{ emoji }}
        </div>
        <div class="ChatBlockLikes-like-content-counter">
          {{ getLikeCount(emoji) }}
        </div>
      </div>
    </button>
  </div>
</template>
<script lang="ts">
import AuthManager from '#logic/managers/AuthManager';
import type { CommentLike } from '#logic/types/CommentTypes';
import { type PropType, defineComponent } from 'vue';
import { getLikeEmoji } from '#logic/constants';

export default defineComponent({
  name: 'ChatBlockLikes',
  props: {
    likes: {
      type: Object as PropType<CommentLike[]>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['like'],
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    messageLikes() {
      return new Set(this.likes.map((el) => el.emoji));
    },
  },
  methods: {
    getLikeEmoji,
    getLikeCount(emoji: string) {
      return this.likes.filter((l) => l.emoji === emoji).length;
    },
    emojiSelectedByCurrentUser(emoji: string) {
      return this.likes.find(
        (l) => l.user.AccountId === this.userInfo?.id && l.emoji === emoji,
      );
    },
    async changeMyLike(emoji: string) {
      if (this.readonly) return;
      this.$emit('like', emoji);
    },
  },
});
</script>
<style lang="scss" scoped>
.ChatBlockLikes-like {
  padding: 5px 10px 1px;
  display: flex;
  align-items: center;
  font-size: 12px;
  max-height: 24px;
  white-space: nowrap;
  border: 1px solid var(--local-border-color);
  background-color: var(--local-bg-color);
  color: var(--local-text-color);

  &:hover {
    background-color: var(--local-hl-bg-color);
  }
  &.my-like {
    border: 1px solid var(--color-accent);
  }

  .ChatBlockLikes-like-content {
    display: flex;
    gap: 5px;

    .ChatBlockLikes-like-content-emoji {
      width: 18px;
      height: 18px;
      &.type-heart {
        color: #f20000;
      }
    }
  }
}
</style>
