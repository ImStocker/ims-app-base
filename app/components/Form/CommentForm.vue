<template>
  <div class="CommentForm is-panel">
    <div class="CommentForm-header">
      <div class="CommentForm-header-title">{{ $t('hub.comments') }}</div>
      <div v-if="commentsCount" class="CommentForm-header-count">
        {{ commentsCount }}
      </div>
    </div>
    <create-event
      ref="reply"
      :post-create-v-m="postCreateVM"
      :parent-id="postId"
      :placeholder="$t('pulsePage.replyPlaceholder')"
      :buttons-outside="false"
    ></create-event>
    <slot name="comment-tree"></slot>
  </div>
</template>

<script lang="ts">
import type { PropType, UnwrapRef } from 'vue';
import { defineComponent } from 'vue';
import CreateEvent from '../Pulse/CreateEvent.vue';
import type { PostBranchVM } from '../../logic/vm/PostBranchVM';

export default defineComponent({
  name: 'CommentForm',
  components: {
    CreateEvent,
  },
  props: {
    postId: {
      type: String,
      required: true,
    },
    postCreateVM: {
      type: Object as PropType<UnwrapRef<PostBranchVM>>,
      required: true,
    },
  },
  computed: {
    commentsCount() {
      const count = this.postCreateVM.getPosts().length;
      return count > 0 ? count - 1 : 0;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.CommentForm {
  padding: 20px 25px;
}
.CommentForm-header {
  display: flex;
  gap: 10px;
  margin-bottom: 19px;
  align-items: center;
}
.CommentForm-header-title {
  font-size: 20px;
  font-weight: 700;
}
.CommentForm-header-count {
  font-size: 15px;
  text-align: center;
  padding: 0px 12px;
  height: 23px;
  display: flex;
  align-items: center;
  color: var(--local-box-color);
  background-color: var(--local-text-color);
  border: 1px solid var(--local-text-color);
  border-radius: 999px;
}
</style>
