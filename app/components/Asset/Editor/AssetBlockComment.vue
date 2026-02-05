<template>
  <div
    v-if="hasMessages || canComment"
    class="AssetBlockComment"
    :class="{
      'is-active': show_chat,
      'has-message': hasMessages,
    }"
  >
    <button
      v-if="!show_chat"
      class="is-button is-button-icon"
      :class="{ 'active-button': hasChanges && !commentWasOpened }"
      @click="openChat()"
    >
      <i v-if="hasMessages" class="ri-chat-4-fill"></i>
      <i v-else class="ri-chat-new-fill"></i>
    </button>
    <div
      v-else-if="!openedComment || openedComment === resolvedBlock.id"
      class="AssetBlockComment-chat"
    >
      <Teleport to=".AssetsPageContent-rightColumn">
        <div class="AssetBlockComment-chat">
          <button
            class="is-button is-button-icon AssetBlockComment-chat-close"
            @click="show_chat = false"
          >
            <i class="ri-close-fill"></i>
          </button>
          <chat-block
            v-model:last-viewed-at="lastViewedAt"
            class="AssetBlockComment-chat-block tiny-scrollbars"
            :resolved-block="resolvedBlock"
            :asset-block-editor="assetBlockEditor"
            :readonly="!canComment"
          ></chat-block>
        </div>
      </Teleport>
    </div>
  </div>
  <div v-else></div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ChatBlock from '~ims-plugin-base/blocks/ChatBlock/ChatBlock.vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import AuthManager from '../../../logic/managers/AuthManager';
export default defineComponent({
  name: 'AssetBlockComment',
  components: {
    ChatBlock,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    openedComment: {
      type: String,
      default: null,
    },
  },
  emits: ['open-comment'],
  data() {
    return {
      show_chat: false,
      commentWasOpened: false,
    };
  },
  computed: {
    canComment() {
      return this.assetBlockEditor.canCommentBlocks();
    },
    blockCommentIndex() {
      if (!this.assetBlockEditor.assetFull) {
        return -1;
      }
      if (!this.assetBlockEditor.assetFull.comments) {
        return -1;
      }
      return this.assetBlockEditor.assetFull?.comments?.findIndex((block) =>
        block.blocks.find((b) => b.id === this.resolvedBlock.id),
      );
    },
    blockComment() {
      if (this.blockCommentIndex < 0) {
        return null;
      }
      return this.assetBlockEditor.assetFull?.comments[this.blockCommentIndex];
    },
    lastViewedAt: {
      get() {
        return this.blockComment?.lastViewedAt;
      },
      set(val: string) {
        if (this.blockComment) {
          this.blockComment.lastViewedAt = val;
        }
      },
    },
    isLoggedIn() {
      return !!this.$getAppManager().get(AuthManager).getUserInfo();
    },
    hasMessages() {
      return this.blockComment && this.blockComment.blocks.length > 0;
    },
    hasChanges() {
      return (
        this.isLoggedIn &&
        this.blockComment &&
        (!this.blockComment.lastViewedAt ||
          this.blockComment.lastViewedAt < this.blockComment.updatedAt)
      );
    },
  },
  watch: {
    openedComment() {
      this.show_chat = this.openedComment === this.resolvedBlock.id;
    },
  },
  methods: {
    openChat() {
      this.show_chat = true;
      this.$emit('open-comment', this.resolvedBlock.id);
      this.commentWasOpened = true;
    },
  },
});
</script>
<style lang="scss">
@use '$style/devices-mixins.scss';
.AssetBlockComment {
  opacity: 0;
  position: absolute;
  top: 0;
  right: -30px;
  &.is-active {
    opacity: 1;
    right: -310px;
  }
  &.has-message {
    opacity: 1;
  }
  .active-button {
    color: var(--color-accent);
  }
}
.AssetBlockComment-chat {
  margin-top: 25px;
  position: fixed;
  z-index: 1;
  width: 322px;
  padding-top: 33px;

  @include devices-mixins.device-type(not-pc) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    margin-top: 40px;
    padding-right: 8px;
  }
}
.AssetBlockComment-chat-close {
  position: absolute;
  left: 0;
  top: 16px;

  @include devices-mixins.device-type(not-pc) {
    left: auto;
    right: 8px;
    top: 34px;
    font-size: 20px;
  }
}
.AssetBlockComment-chat-block {
  border-radius: 34px !important;
  min-height: calc(100vh - 80px);
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  background-color: var(--panel-bg-color) !important;
  margin-left: 8px;
  --local-bg-color: var(--panel-bg-color) !important;
}
.AssetBlockComment-chat-block:deep(.ChatBlock-sendForm-wrapper) {
  border-radius: 20px;
}
</style>
