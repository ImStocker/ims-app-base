<template>
  <div class="PulsePost-likes use-buttons-rounded">
    <FormCheckSmile
      v-if="!smileIsBusy"
      :selected-likes-dict="likesDictionary"
      @input="changeMyLike($event)"
    ></FormCheckSmile>
    <button v-else class="is-button loading PulsePost-manage-loading"></button>
    <button
      v-for="emoji of emojis"
      :key="emoji.emoji"
      :class="{
        'PulsePost-like-of-user': emojiSelectedByCurrentUser(emoji.emoji),
      }"
      class="is-button PulsePost-like"
      @click="changeMyLike(emoji)"
    >
      <div class="PulsePost-like-content">
        <div
          class="PulsePost-like-content-emoji"
          :class="{
            [`type-${emoji.emoji.toLowerCase()}`]: true,
          }"
        >
          {{ getLikeEmoji(emoji.emoji) }}
        </div>
        <div class="PulsePost-like-content-counter">
          {{ getLikeCount(emoji.emoji) }}
        </div>
      </div>
    </button>
  </div>
</template>
<script lang="ts">
import AuthManager from '#logic/managers/AuthManager';
import type { CommentReplyDTO } from '#logic/types/CommentTypes';
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
    message: {
      type: Object as PropType<CommentReplyDTO>,
      required: true,
    },
  },
  data() {
    return {
      smileIsBusy: false,
      emojis: [...this.message.likes],
    };
  },
  computed: {
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    isAuthor() {
      if (!this.userInfo) return false;
      return this.message.user.AccountId === this.userInfo.id.toString();
    },
    likesDictionary() {
      const likes_dict = {};
      this.emojis.forEach((l) => {
        likes_dict[l.emoji] = !!this.emojiSelectedByCurrentUser(l.emoji);
      });
      return likes_dict;
    },
  },
  methods: {
    getLikeEmoji,
    getLikeCount(emoji: string) {
      return this.emojis.filter((l) => l.emoji === emoji).length;
    },
    emojiSelectedByCurrentUser(emoji: string) {
      return this.emojis.find(
        (l) =>
          l.user.AccountId === this.userInfo?.id.toString() &&
          l.emoji === emoji,
      );
    },
    async changeMyLike(emoji: any) {
      const like_is_set_ind = this.emojis.findIndex((l) => l.emoji === emoji);
      await this.setLike(like_is_set_ind > -1 ? null : emoji);
      if (like_is_set_ind > -1) {
        this.emojis.splice(like_is_set_ind, 1);
      } else if (this.userInfo) {
        this.emojis.push({
          user: {
            AccountId: this.userInfo.id.toString(),
            Name: this.userInfo.name,
          },
          emoji,
        });
      }
    },
    async setLike(emoji: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.$getAppManager()
            .get(CommentManager)
            .setLike(this.message.commentId, this.message.id, {
              like: emoji,
            });
        });
    },
  },
});
</script>
