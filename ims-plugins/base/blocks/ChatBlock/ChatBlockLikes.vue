<template>
  <div class="PulsePost-likes use-buttons-rounded">
    <FormCheckSmile
      v-if="!smileIsBusy"
      :selected-likes-dict="likesDictionary"
      @input="changeMyLike($event)"
    ></FormCheckSmile>
    <button v-else class="is-button loading PulsePost-manage-loading"></button>
    <button
      v-for="like of likes"
      :key="like.emoji"
      :class="{
        'PulsePost-like-of-user': emojiSelectedByCurrentUser(like.emoji),
      }"
      class="is-button PulsePost-like"
      @click="changeMyLike(like)"
    >
      <div class="PulsePost-like-content">
        <div
          class="PulsePost-like-content-emoji"
          :class="{
            [`type-${like.emoji.toLowerCase()}`]: true,
          }"
        >
          {{ getLikeEmoji(like.emoji) }}
        </div>
        <div class="PulsePost-like-content-counter">
          {{ getLikeCount(like.emoji) }}
        </div>
      </div>
    </button>
  </div>
</template>
<script lang="ts">
import AuthManager from '#logic/managers/AuthManager';
import type { CommentLike } from '#logic/types/CommentTypes';
import { type PropType, defineComponent } from 'vue';
import FormCheckSmile from '#components/Form/FormCheckSmile.vue';
import { getLikeEmoji } from '#logic/constants';
import CommentManager from '#logic/managers/CommentManager';
import UiManager from '#logic/managers/UiManager';

export default defineComponent({
  name: 'ChatBlockLikes',
  components: {
    FormCheckSmile,
  },
  props: {
    commentId: {
      type: String,
      required: true,
    },
    replyId: {
      type: String,
      required: true,
    },
    likes: {
      type: Array as PropType<CommentLike[]>,
      default: () => [],
    },
  },
  data() {
    return {
      smileIsBusy: false,
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    likesDictionary() {
      const likes_dict = {};
      this.likes.forEach((l) => {
        likes_dict[l.emoji] = !!this.emojiSelectedByCurrentUser(l.emoji);
      });
      return likes_dict;
    },
  },
  methods: {
    getLikeEmoji,
    getLikeCount(emoji: string) {
      return this.likes.filter((l) => l.emoji === emoji).length;
    },
    emojiSelectedByCurrentUser(emoji: string) {
      return this.likes.find(
        (l) =>
          l.user.AccountId === this.userInfo?.id.toString() &&
          l.emoji === emoji,
      );
    },
    async changeMyLike(emoji: any) {
      const like_is_set = this.likes.find((l) => l.emoji === emoji);
      await this.setLike(like_is_set ? null : emoji);
    },
    async setLike(emoji: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CommentManager)
            .setLike(this.commentId, this.replyId, {
              like: emoji,
            });
        });
    },
  },
});
</script>
