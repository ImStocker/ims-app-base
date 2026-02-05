<template>
  <div
    class="ChatBlock"
    :class="{ 'state-has-messages': messagesList.length > 0 }"
  >
    <div class="ChatBlock-inner">
      <div ref="messagesField" class="ChatBlock-chat tiny-scrollbars">
        <div class="ChatBlock-chat-messagesField">
          <div
            v-if="loading && initialLoad"
            class="loaderSpinner PageLoaderSpinner"
          />
          <template v-else>
            <chat-block-message
              v-for="(message, idx) of unreadMessagesList"
              :key="message.commentId"
              class="ChatBlock-chat-message"
              :message="message"
              :show-username="showUsername(idx, unreadMessagesList)"
              @delete="deleteMessage($event)"
              @edit="editMessage($event)"
            />
            <div
              v-if="unreadMessagesList.length > 0"
              class="ChatBlock-chat-messagesField-unread"
            >
              {{ $t('unreadMessage') }}
            </div>
            <chat-block-message
              v-for="(message, idx) of readMessagesList"
              :key="message.commentId"
              class="ChatBlock-chat-message"
              :message="message"
              :show-username="showUsername(idx, readMessagesList)"
              @delete="deleteMessage($event)"
              @edit="editMessage($event)"
            />
          </template>
        </div>
      </div>
      <Teleport
        v-if="!isGuest && isMounted"
        :to="teleportMessageFormTo"
        :disabled="!teleportMessageFormTo"
      >
        <div class="ChatBlock-sendForm-wrapper" :class="{ editMode: editMode }">
          <slot name="additionalLeftButtons"></slot>
          <div class="ChatBlock-sendForm-wrapper-common">
            <div v-if="editMode" class="ChatBlock-sendForm-editMode">
              <div class="ChatBlock-sendForm-editMode-content">
                {{ $t('discussions.editingMessage') }}
              </div>
              <button
                class="button ChatBlock-sendForm-editMode-manage"
                @click="closeEditingMode()"
              >
                <i class="ri-close-fill" />
              </button>
            </div>
            <div v-if="!readonly" class="ChatBlock-sendForm">
              <file-attach-button
                :multiple="true"
                :display-mode="'icon'"
                class="ChatBlock-sendForm-attachButton"
                @uploaded-one="attachFile($event)"
              />
              <imc-editor
                ref="editor"
                class="ChatBlock-sendForm-input tiny-scrollbars"
                :placeholder="$t('discussions.placeholder')"
                :model-value="commentContent"
                :max-height="200"
                @update:model-value="commentContent = $event"
                @enter="sendMessage()"
              />
              <button
                class="button ChatBlock-sendForm-button"
                @click="sendMessage()"
              >
                <i class="ri-send-plane-fill" />
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, type RendererElement, defineComponent } from 'vue';
import ImcEditor from '#components/ImcText/ImcEditor.vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import CommentManager from '#logic/managers/CommentManager';
import {
  type AssetPropValue,
  type AssetPropValueFile,
  joinAssetPropValueTexts,
} from '#logic/types/Props';
import type {
  AssetCommentDTO,
  CommentBlockDTO,
  CommentReplyDTO,
} from '#logic/types/CommentTypes';
import AuthManager from '#logic/managers/AuthManager';
import ChatBlockMessage from './ChatBlockMessage.vue';
import { v4 as uuidv4 } from 'uuid';
import UiManager from '#logic/managers/UiManager';
import DialogManager from '#logic/managers/DialogManager';
import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import ProjectManager from '#logic/managers/ProjectManager';
import FileAttachButton from '#components/File/FileAttachButton.vue';
import { DISCUSSION_WORKSPACE_NAME } from '#logic/constants';

export default defineComponent({
  name: 'ChatBlock',
  components: {
    ImcEditor,
    ChatBlockMessage,
    FileAttachButton,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    teleportMessageFormTo: {
      type: [Object, String, null] as PropType<RendererElement | string | null>,
      default: null,
    },
    lastViewedAt: {
      type: String,
      default: undefined,
    },
  },
  emits: ['sendMessage', 'update:lastViewedAt'],
  data() {
    return {
      commentContent: {} as AssetPropValue,
      messages: [] as CommentReplyDTO[],
      unsentMessages: [] as CommentReplyDTO[],
      loading: false as boolean,
      initialLoad: true,
      editMode: false as boolean,
      editingMessageId: null as string | null,
      reloadMessagesTimeout: null as any,
      reloadMessagesRun: false,
      isMounted: false,
    };
  },
  computed: {
    messagesList() {
      return [...this.unsentMessages, ...this.messages];
    },
    unreadMessagesList() {
      const last_viewed_at = this.lastViewedAt;
      if (!last_viewed_at) {
        return [];
      }
      return this.lastViewedAt
        ? this.messagesList.filter(
            (message) => message.sended && message.createdAt > last_viewed_at,
          )
        : [];
    },
    readMessagesList() {
      const last_viewed_at = this.lastViewedAt;
      if (!last_viewed_at) {
        return this.messagesList;
      }
      return this.lastViewedAt
        ? this.messagesList.filter(
            (message) =>
              !message.sended ||
              (message.sended && message.createdAt <= last_viewed_at),
          )
        : [];
    },
    currentAsset() {
      return this.assetBlockEditor.assetFull;
    },
    chatCommentBranch() {
      return this.currentAsset?.comments.filter((comment: AssetCommentDTO) =>
        comment.blocks.find(
          (b: CommentBlockDTO) =>
            b.id === this.resolvedBlock.id && b.anchor.chat,
        ),
      )[0];
    },
    chatCommentBranchId(): string | null {
      if (!this.chatCommentBranch) return null;
      return this.chatCommentBranch.id;
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    messageIsEmpty() {
      return typeof this.commentContent === 'object'
        ? !Object.keys(this.commentContent as any).length
        : !this.commentContent;
    },
    isGuest(): boolean {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  watch: {
    async chatCommentBranchId(new_val, old_val) {
      if (old_val) {
        this.initialLoad = true;
      }
      await this.reloadMessages();
      await this.scrollToBottom();
    },
  },
  async mounted() {
    this.initialLoad = true;
    this.isMounted = true;
    await this.reloadMessages();
    await this.scrollToBottom();
  },
  unmounted() {
    this.stopReloadMessages();
  },
  methods: {
    attachFile(file: AssetPropValueFile) {
      if (!file) return;
      let res = this.commentContent;
      if (res) {
        res = joinAssetPropValueTexts(res, file);
      } else res = file;
      this.commentContent = res;
    },
    async scrollToBottom() {
      if (!this.loading) {
        const messagesField = this.$refs.messagesField as HTMLElement;
        if (messagesField) {
          await this.$nextTick();
          messagesField.scrollTop = messagesField.scrollHeight;
        }
      }
    },
    async reloadMessages() {
      this.stopReloadMessages();
      this.reloadMessagesRun = true;
      await this.loadMessages();
      if (this.reloadMessagesRun) {
        this.reloadMessagesTimeout = setTimeout(
          () => this.reloadMessages(),
          2000,
        );
      }
    },
    closeEditingMode() {
      this.editMode = false;
      this.commentContent = '';
    },
    async editMessage(message_id: string) {
      this.editMode = true;
      const editing_message =
        this.messages.find(
          (message: CommentReplyDTO) => message.id === message_id,
        ) ?? null;
      if (!editing_message) return;
      this.commentContent = editing_message.content[''];
      this.editingMessageId = editing_message.id;
      await this.$nextTick();
      (this.$refs.editor as InstanceType<typeof ImcEditor>).focusEnd();
    },
    async deleteMessage(message: { commentId: string; replyId: string }) {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('discussions.delete') + '?',
          message: this.$t('discussions.deleteMessageConfirm'),
          yesCaption: this.$t('common.dialogs.delete'),
          danger: true,
        });
      if (answer) {
        this.commentContent = '';
        this.editMode = false;
        this.editingMessageId = null;
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            const deleted_message_index = this.messages.findIndex(
              (msg: CommentReplyDTO) => msg.id === message.replyId,
            );
            if (deleted_message_index !== -1) {
              if (this.messagesList.length === 0) {
                const discussions_workspace_id = this.$getAppManager()
                  .get(ProjectManager)
                  .getWorkspaceIdByName(DISCUSSION_WORKSPACE_NAME);
                if (discussions_workspace_id) {
                  await this.$getAppManager()
                    .get(CreatorAssetManager)
                    .getAssetInstancesList({
                      where: {
                        workspaceId: discussions_workspace_id,
                      },
                    });
                }
              }
            }
            await this.$getAppManager()
              .get(CommentManager)
              .deleteReply(message.commentId, message.replyId);
            this.messages.splice(deleted_message_index, 1);
          });
      }
    },
    showUsername(idx: number, list: any[]) {
      if (idx === list.length - 1) return true;
      return list[idx].user.AccountId !== list[idx + 1].user.AccountId;
    },
    async loadMessages() {
      this.loading = true;
      const loading_branch_id = this.chatCommentBranchId;
      if (loading_branch_id) {
        this.$emit('update:lastViewedAt', new Date().toISOString());
        try {
          const res = await this.$getAppManager()
            .get(CommentManager)
            .getComments(loading_branch_id, {});
          if (loading_branch_id === this.chatCommentBranchId) {
            const messages = [] as CommentReplyDTO[];
            res.ids.forEach((id: string) => {
              const message_idx = this.messages.findIndex(
                (message) => message.commentId === id,
              );
              if (message_idx === -1) {
                messages.push({ ...res.objects.replies[id], sended: true });
              }
            });
            this.messages = [...messages];
          }
        } catch (err) {
          if (this.initialLoad) {
            this.$getAppManager().get(UiManager).showError(err);
          } else {
            console.error(err);
          }
        }
      } else {
        this.messages = [];
      }
      this.$emit('update:lastViewedAt', new Date().toISOString());
      this.loading = false;
      this.initialLoad = false;
    },
    async sendMessage() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          if (!this.currentAsset) {
            return;
          }
          if (this.messageIsEmpty) {
            return;
          }

          this.$emit('sendMessage');
          if (!this.editMode) {
            const comment_content_to_db: any =
              typeof this.commentContent === 'object'
                ? { ...this.commentContent }
                : this.commentContent;

            if (this.chatCommentBranch && this.messages.length) {
              const new_message_id = 'temp-' + uuidv4();
              const new_message: CommentReplyDTO = {
                id: new_message_id,
                commentId: this.chatCommentBranch?.id ?? '',
                answerToId: '',
                user: {
                  AccountId: this.userInfo ? this.userInfo.id.toString() : '0',
                  Name: this.userInfo ? this.userInfo.name : '',
                },
                content: { '': this.commentContent },
                createdAt: new Date().toString(),
                updatedAt: new Date().toString(),
                sended: false,
              };
              this.unsentMessages.unshift(new_message);
              this.$emit('update:lastViewedAt', new Date().toISOString());
              await this.scrollToBottom();
              this.commentContent = '';
              const res = await this.$getAppManager()
                .get(CommentManager)
                .addAnswer(this.chatCommentBranch.id, {
                  assetId: this.currentAsset.id,
                  content: { '': comment_content_to_db },
                  blocks: [
                    {
                      id: this.resolvedBlock.id,
                      anchor: { chat: true },
                    },
                  ],
                });
              this.$emit('update:lastViewedAt', new Date().toISOString());
              if (res) {
                const newMessageIndex = this.unsentMessages.findIndex(
                  (message: CommentReplyDTO) => message.id === new_message_id,
                );
                if (newMessageIndex !== -1) {
                  this.unsentMessages[newMessageIndex] = {
                    ...res,
                    sended: true,
                  };
                  const msg_index = this.messages.findIndex(
                    (message: CommentReplyDTO) =>
                      message.id === this.unsentMessages[newMessageIndex].id,
                  );
                  if (msg_index === -1) {
                    this.messages.unshift(this.unsentMessages[newMessageIndex]);
                  }
                  this.unsentMessages.splice(newMessageIndex, 1);
                }
              }
            } else {
              this.commentContent = '';

              const res = await this.$getAppManager()
                .get(CommentManager)
                .createComment({
                  assetId: this.currentAsset.id,
                  content: { '': comment_content_to_db },
                  blocks: [
                    {
                      id: this.resolvedBlock.id,
                      anchor: { chat: true },
                    },
                  ],
                });
              if (res) {
                this.stopReloadMessages();
                await this.reloadMessages();
              }
            }
          } else {
            if (!this.editingMessageId) return;
            if (!this.chatCommentBranch) return;
            const comment_content_to_db: any =
              typeof this.commentContent === 'object'
                ? { ...this.commentContent }
                : this.commentContent;
            const editing_message_index = this.messages.findIndex(
              (message: CommentReplyDTO) =>
                message.id === this.editingMessageId,
            );

            if (editing_message_index === -1) return;

            this.messages[editing_message_index].content = {
              '': comment_content_to_db,
            };
            this.messages[editing_message_index].sended = false;

            this.commentContent = '';
            this.editMode = false;
            this.editingMessageId = null;

            const res = await this.$getAppManager()
              .get(CommentManager)
              .changeReply(
                this.chatCommentBranch?.id,
                this.messages[editing_message_index].id,
                {
                  content: { '': comment_content_to_db },
                },
              );
            if (res) {
              this.messages[editing_message_index] = { ...res, sended: true };
            }
          }
        });
    },
    stopReloadMessages() {
      this.reloadMessagesRun = false;
      if (this.reloadMessagesTimeout) {
        clearTimeout(this.reloadMessagesTimeout);
        this.reloadMessagesTimeout = null;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';
@use '$style/scrollbars-mixins.scss';

.ChatBlock {
  background-color: var(--local-bg-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.ChatBlock-inner {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding: 10px;
  flex: 1;
  min-height: 0;
}

.ChatBlock-chat {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.ChatBlock-sendForm-wrapper {
  display: flex;
  align-items: end;
  position: relative;
  flex-direction: row;
  align-items: center;
  background: var(--local-bg-color);

  .ChatBlock-sendForm {
    margin: auto 0 0;
    border: 1px dotted #ccc;
    display: flex;
    padding: 0px 35px;
    border-radius: 26px;
    width: 100%;
    position: relative;
    background-color: transparent;
    // max-height: 300px;
    // overflow-y: auto;
    // overflow-x: hidden;

    // &::-webkit-scrollbar-track {
    //   margin-top: 20px;
    //   margin-bottom: 20px;
    // }

    .ChatBlock-sendForm-input {
      width: 100%;
      padding: 10px 0;

      :deep(.ql-editor) {
        @include scrollbars-mixins.tiny-scrollbars;
      }
    }

    .ChatBlock-sendForm-button {
      margin: auto 0 0 auto;
      font-size: 18px;
      right: 3px;
      bottom: 3px;
      box-shadow: none;
      padding: 5px 10px;
      position: absolute;
      border-radius: 100%;
      background-color: transparent;
      transition:
        background-color 0.2s,
        color 0.2s;
      color: var(--text-intense);

      &:hover {
        background-color: var(--color-main-yellow);
        color: var(--local-bg-color);
      }

      @include devices-mixins.device-type(not-pc) {
        &:hover {
          background-color: transparent;
          color: var(--text-intense);
        }
      }

      i {
        transform: translate(-1px, 1px);
        display: block;
      }
    }

    .ChatBlock-sendForm-attachButton {
      position: absolute;
      left: 3px;
      bottom: 4px;
      padding: 4px 10px;
      display: block;

      :deep(.FileAttachButton-attach-button) {
        padding: 0 !important;
        width: auto;
        font-size: 18px;
      }
    }
  }
}
.ChatBlock-sendForm-wrapper-common {
  z-index: 2;
  width: 100%;
  padding-right: 5px;
}
.ChatBlock-sendForm-editMode {
  background-color: rgba(238, 216, 17, 0.2);
  color: var(--panel-bg-color);
  top: 0;
  width: fit-content;
  padding: 0 10px;
  margin-right: 18px;
  margin-left: 18px;
  border-radius: 4px 4px 0px 0px;
  outline: 1px solid var(--color-main-yellow);
  display: flex;
  gap: 5px;
  position: relative;
  margin-top: -20px;

  .ChatBlock-sendForm-editMode-content {
    color: var(--color-main-yellow);
  }

  .ChatBlock-sendForm-editMode-manage {
    padding: 0px;
    background-color: transparent;
    color: var(--color-main-yellow);
    text-shadow: none;
  }
}

.ChatBlock-chat-message {
  margin-bottom: 10px;
}

.ChatBlock.state-has-messages {
  .ChatBlock-chat-messagesField {
    padding-bottom: 15px;
  }
}

.ChatBlock-chat-messagesField {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  flex: 1;
}

.ChatBlock-chat-messagesField-unread {
  width: 100%;
  text-align: center;
  background: var(--panel-box-color);
  margin-bottom: 10px;
  font-style: italic;
}
</style>
