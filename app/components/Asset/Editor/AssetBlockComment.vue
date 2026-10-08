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
      class="is-button is-button-icon"
      :class="{ 'active-button': hasChanges && !commentWasOpened }"
      @click="toggleChat()"
    >
      <i v-if="blockComment?.hasMention" class="ri-chat-unread-fill"></i>
      <i v-else-if="hasMessages" class="ri-chat-4-fill"></i>
      <i v-else class="ri-chat-new-fill"></i>
    </button>
    <dropdown-element
      v-model:shown="show_chat"
      attach-position="right"
      hide-trigger="clickOutsideAttached"
      @hide="onChatHide"
    >
      <div class="AssetBlockComment-chat">
        <div class="AssetBlockComment-chat-header">
          <span class="AssetBlockComment-chat-title" :title="chatTitle">
            <i class="ri-chat-4-fill"></i>
            <span>{{ chatTitle }}</span>
          </span>
          <button
            class="is-button is-button-icon AssetBlockComment-chat-close"
            @click="show_chat = false"
          >
            <i class="ri-close-fill"></i>
          </button>
        </div>
        <chat-block
          ref="chat"
          v-model:last-viewed-at="lastViewedAt"
          class="AssetBlockComment-chat-block tiny-scrollbars"
          :resolved-block="resolvedBlock"
          :asset-block-editor="assetBlockEditor"
          :readonly="!canComment"
        ></chat-block>
      </div>
    </dropdown-element>
  </div>
  <div v-else></div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ChatBlock from '~ims-plugin-base/blocks/ChatBlock/ChatBlock.vue';
import DropdownElement from '../../Common/DropdownElement.vue';
import {
  convertTranslatedTitle,
  type ResolvedAssetBlock,
} from '../../../logic/utils/assets';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import AuthManager from '../../../logic/managers/AuthManager';
export default defineComponent({
  name: 'AssetBlockComment',
  components: {
    ChatBlock,
    DropdownElement,
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
    blockTitleText() {
      const source = this.resolvedBlock.title || this.resolvedBlock.name;
      if (!source) return '';
      return convertTranslatedTitle(source, (key) => this.$t(key));
    },
    chatTitle() {
      const block_title = this.blockTitleText;
      if (!block_title) return this.$t('hub.comments');
      return this.$t('hub.commentsToBlock', { title: block_title });
    },
  },
  watch: {
    openedComment() {
      this.show_chat = this.openedComment === this.resolvedBlock.id;
    },
  },
  methods: {
    async revealCommentReply(reply_id: string) {
      let chat = this.$refs['chat'] as InstanceType<typeof ChatBlock> | null;
      for (let i = 0; i < 6 && !chat; i++) {
        await this.$nextTick();
        chat = this.$refs['chat'] as InstanceType<typeof ChatBlock> | null;
      }
      if (!chat) return false;
      return chat.revealCommentReply(reply_id);
    },
    openChat() {
      this.show_chat = true;
      this.$emit('open-comment', this.resolvedBlock.id);
      this.commentWasOpened = true;
    },
    toggleChat() {
      if (this.show_chat) {
        this.show_chat = false;
      } else {
        this.openChat();
      }
    },
    async onChatHide() {
      await this.$nextTick();
      if (this.openedComment === this.resolvedBlock.id) {
        this.$emit('open-comment', null);
      }
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/devices-mixins.scss';
.AssetBlockComment {
  opacity: 0;
  position: absolute;
  top: 0;
  right: -30px;

  &.is-active {
    opacity: 1;
  }
  &.has-message {
    opacity: 1;
  }
  .active-button {
    color: var(--color-accent);
  }
}
.AssetBlockComment-chat {
  --AssetBlockComment-chat-width: 322px;
  display: flex;
  flex-direction: column;
  width: var(--AssetBlockComment-chat-width);
  height: 100%;
  min-height: 600px;
  border-radius: 16px;
  border: 1px solid var(--local-border-color);
  background-color: var(--editor-bg-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);

  @include devices-mixins.device-type(not-pc) {
    position: fixed;
    top: 56px;
    left: 8px;
    right: 8px;
    bottom: 12px;
    width: auto;
    height: auto;
    max-width: 460px;
    margin: 0 auto;
  }
}
.AssetBlockComment-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 8px 10px 16px;
  border-bottom: 1px solid var(--local-border-color);
  border-radius: 16px 16px 0 0;
  flex-shrink: 0;
}
.AssetBlockComment-chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-main);
  i {
    flex: none;
    color: var(--color-accent);
    font-size: 14px;
  }
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.AssetBlockComment-chat-close {
  font-size: 18px;
  color: var(--color-text-subtle);
  &:hover {
    color: var(--color-text-main);
  }
  @include devices-mixins.device-type(not-pc) {
    position: static;
    left: auto;
    right: auto;
    top: auto;
    font-size: 18px;
  }
}
.AssetBlockComment-chat-block {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 0 !important;
  margin-left: 0;
  background-color: transparent !important;
  --local-bg-color: transparent !important;
  border: none !important;
}
.AssetBlockComment-chat-block:deep(.ChatBlock-sendForm-wrapper) {
  border-radius: 12px;
  margin: 8px;
  background: var(--panel-bg-color) !important;
}
</style>
