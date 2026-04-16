<template>
  <div
    class="ChatBlock"
    :class="{ 'state-has-messages': messagesList.length > 0 }"
  >
    <div class="ChatBlock-inner">
      <div ref="messagesField" class="ChatBlock-chat tiny-scrollbars">
        <feed-loader
          :load-more="async () => await loadOlderMessages()"
          :has-more="hasMoreOlder"
          :disabled="isLoading"
          class="ChatBlock-chat-messagesField"
        >
          <div v-if="false" class="loaderSpinner PageLoaderSpinner" />
          <template v-else>
            <chat-block-message
              v-for="(message, idx) of unreadMessagesList"
              :id="'reply-' + message.id"
              :key="message.id"
              class="ChatBlock-chat-message"
              :message="message"
              :all-messages="allMessages"
              :show-username="showUsername(idx, unreadMessagesList)"
              :show-user-icon="showUserIcon(idx, unreadMessagesList)"
              @delete="deleteMessage($event)"
              @edit="startMessageEditing($event)"
              @reply="replyMessage($event)"
              @target-message-click="revealCommentReply($event)"
              @view-ready="onMessageViewReady()"
            />
            <div
              v-if="unreadMessagesList.length > 0"
              class="ChatBlock-chat-messagesField-unread"
            >
              {{ $t('unreadMessage') }}
            </div>
            <chat-block-message
              v-for="(message, idx) of readMessagesList"
              :id="'reply-' + message.id"
              :key="message.id"
              class="ChatBlock-chat-message"
              :message="message"
              :all-messages="allMessages"
              :show-username="showUsername(idx, readMessagesList)"
              :show-user-icon="showUserIcon(idx, readMessagesList)"
              @delete="deleteMessage($event)"
              @edit="startMessageEditing($event)"
              @reply="replyMessage($event)"
              @target-message-click="revealCommentReply($event)"
              @view-ready="onMessageViewReady()"
            />
          </template>
        </feed-loader>
      </div>
      <Teleport
        v-if="!isGuest && isMounted"
        :to="teleportMessageFormTo"
        :disabled="!teleportMessageFormTo"
      >
        <slot name="additionalLeftButtons"></slot>
        <chat-block-send
          v-if="!readonly"
          v-model:target-message="targetMessage"
          @send="sendMessage($event)"
        ></chat-block-send>
      </Teleport>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, type RendererElement, defineComponent } from 'vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import CommentManager from '#logic/managers/CommentManager';
import type {
  AssetCommentDTO,
  CommentBlockDTO,
  CommentReplyDTO,
  GetCommentsParamsDTO,
} from '#logic/types/CommentTypes';
import AuthManager from '#logic/managers/AuthManager';
import ChatBlockMessage from './ChatBlockMessage.vue';
import UiManager from '#logic/managers/UiManager';
import DialogManager from '#logic/managers/DialogManager';
import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import CreatorAssetManager from '#logic/managers/CreatorAssetManager';
import ProjectManager from '#logic/managers/ProjectManager';
import { DISCUSSION_WORKSPACE_NAME } from '#logic/constants';
import ChatBlockSend from './ChatBlockSend.vue';
import { v4 as uuidv4 } from 'uuid';
import {
  isMessageEmpty,
  TargetMessageActionTypes,
  type TargetMessage,
} from './ChatBlock';
import type { AssetPropValue } from '../../../../app/logic/types/Props';
import type { IProjectDatabaseCommentEventHandler } from '#logic/types/IProjectDatabase';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import FeedLoader from '../../../../app/components/Common/FeedLoader.vue';

const MESSAGES_COUNT = 100;

export default defineComponent({
  name: 'ChatBlock',
  components: {
    ChatBlockMessage,
    ChatBlockSend,
    FeedLoader,
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
      allMessages: {} as { [key: string]: CommentReplyDTO },
      messages: [] as CommentReplyDTO[],
      unsentMessages: [] as CommentReplyDTO[],
      targetMessage: null as TargetMessage | null,

      loadError: null as string | null,
      isLoading: false as boolean,
      hasMoreOlder: false,
      hasMoreNewer: false,
      expectMessageEvent: false,

      messageViewReady: false,

      isMounted: false,
      commentListener: null as IProjectDatabaseCommentEventHandler | null,
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
    isGuest(): boolean {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  watch: {
    async chatCommentBranchId() {
      await this.init();
    },
  },
  async mounted() {
    this.isMounted = true;
    await this.init();
  },
  unmounted() {
    this.resetCommentListener(false);
  },
  methods: {
    async onMessageViewReady() {
      if (!this.messageViewReady) {
        this.messageViewReady = true;
        await this.scrollToBottom();
      }
    },
    async scrollToBottom() {
      const container = this.$refs['messagesField'] as HTMLElement | undefined;
      if (!container) return;
      await this.$nextTick();

      container.scrollTop = container.scrollHeight;
    },
    async init() {
      this.resetCommentListener(true);
      await this.loadInitialMessages();
    },
    resetCommentListener(init: boolean) {
      if (this.commentListener) {
        this.commentListener.cancel();
        this.commentListener = null;
      }
      if (init) {
        if (this.chatCommentBranchId) {
          this.commentListener = this.$getAppManager()
            .get(CreatorAssetManager)
            .listenComment(this.chatCommentBranchId, async (ev) => {
              const loading_branch_id = this.chatCommentBranchId;
              if (!loading_branch_id) return;
              switch (ev.t) {
                case 'new': {
                  if (!this.expectMessageEvent) {
                    this.loadNewMessages();
                  }
                  break;
                }
                case 'delete': {
                  if (!this.expectMessageEvent) {
                    const deleted_message_index = this.messages.findIndex(
                      (msg: CommentReplyDTO) => msg.id === ev.rId,
                    );
                    if (deleted_message_index >= 0) {
                      this.messages.splice(deleted_message_index, 1);
                    }
                    delete this.allMessages[ev.rId];
                  }
                  break;
                }
                case 'change': {
                  if (!this.expectMessageEvent) {
                    const message_data = await this.$getAppManager()
                      .get(CommentManager)
                      .getCommentReply(ev.cId, ev.rId);
                    const message_index = this.messages.findIndex(
                      (m) =>
                        m.id === message_data.id &&
                        m.commentId === message_data.commentId,
                    );
                    if (message_index >= 0) {
                      message_data.sended = true;
                      this.messages[message_index] = message_data;
                      this.allMessages[message_data.id] = message_data;
                    }
                  }
                  break;
                }
                case 'like': {
                  if (!this.expectMessageEvent) {
                    const message_data = await this.$getAppManager()
                      .get(CommentManager)
                      .getCommentReply(ev.cId, ev.rId);
                    const message_index = this.messages.findIndex(
                      (m) =>
                        m.id === message_data.id &&
                        m.commentId === message_data.commentId,
                    );
                    if (message_index >= 0) {
                      this.messages[message_index].likes = message_data.likes;
                    }
                  }
                  break;
                }
              }
              console.log(ev);
            });
        }
      }
    },
    async withScrollRestoration(
      cb: () => void,
      direction: 'top' | 'bottom' = 'bottom',
    ) {
      const scrollable_container = this.$refs['messagesField'] as
        | HTMLElement
        | undefined;
      if (!scrollable_container) return;
      const before_scroll_height = scrollable_container.scrollHeight;
      const before_scroll_top = scrollable_container.scrollTop;

      const is_max_scroll =
        scrollable_container.scrollHeight -
          (scrollable_container.scrollTop +
            scrollable_container.clientHeight) <=
        5;

      cb();
      await this.$nextTick();

      if (is_max_scroll) {
        scrollable_container.scrollTop = scrollable_container.scrollHeight;
      } else {
        if (direction === 'bottom') return;
        const after_scroll_height = scrollable_container.scrollHeight;
        const added_height = after_scroll_height - before_scroll_height;
        scrollable_container.scrollTop = before_scroll_top + added_height;
      }
    },
    async loadOlderMessages() {
      this.isLoading = true;
      const loading_branch_id = this.chatCommentBranchId;
      if (!loading_branch_id) return;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const messages_data = await this.$getAppManager()
            .get(CommentManager)
            .getCommentReplies(loading_branch_id, {
              count: MESSAGES_COUNT,
              where: {
                dateTo: this.messages[this.messages.length - 1].createdAt,
              },
            });
          if (loading_branch_id === this.chatCommentBranchId) {
            const messages: CommentReplyDTO[] = [];
            messages_data.ids.forEach((id: string) => {
              const message_idx = this.messages.findIndex(
                (message) => message.commentId === id,
              );
              if (message_idx === -1) {
                messages.push({
                  ...messages_data.objects.replies[id],
                  sended: true,
                });
              }
            });

            await this.withScrollRestoration(() => {
              this.messages = [...this.messages, ...messages];
            }, 'top');

            this.allMessages = Object.assign(
              this.allMessages,
              messages_data.objects.replies,
            );
            this.hasMoreOlder = messages_data.more;
          }
        });
      this.isLoading = false;
    },
    async loadNewMessages() {
      this.isLoading = true;
      const loading_branch_id = this.chatCommentBranchId;
      if (!loading_branch_id) return;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.hasMoreNewer = true;
          const messages: CommentReplyDTO[] = [];
          while (this.hasMoreNewer) {
            let params: GetCommentsParamsDTO = {
              count: MESSAGES_COUNT,
            };
            if (this.messages[0]) {
              params = {
                ...params,
                where: {
                  dateFrom: new Date(
                    +new Date(this.messages[0].createdAt) + 1,
                  ).toISOString(),
                  dateTo: messages.length
                    ? messages[messages.length - 1].createdAt
                    : undefined,
                },
              };
            }

            const messages_data = await this.$getAppManager()
              .get(CommentManager)
              .getCommentReplies(loading_branch_id, params);
            if (loading_branch_id === this.chatCommentBranchId) {
              messages_data.ids.forEach((id: string) => {
                const message_idx = this.messages.findIndex(
                  (message) => message.commentId === id,
                );
                if (message_idx === -1) {
                  messages.push({
                    ...messages_data.objects.replies[id],
                    sended: true,
                  });
                }
              });

              this.allMessages = Object.assign(
                this.allMessages,
                messages_data.objects.replies,
              );
              this.hasMoreNewer = messages_data.more;
            }
          }
          await this.withScrollRestoration(() => {
            this.messages = [...messages, ...this.messages];
          }, 'bottom');
        });
      this.isLoading = false;
    },
    async loadInitialMessages() {
      this.isLoading = true;
      const loading_branch_id = this.chatCommentBranchId;
      if (loading_branch_id) {
        this.$emit('update:lastViewedAt', new Date().toISOString());
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            const messages_data = await this.$getAppManager()
              .get(CommentManager)
              .getCommentReplies(loading_branch_id, {
                count: MESSAGES_COUNT,
              });
            if (loading_branch_id === this.chatCommentBranchId) {
              const messages = [] as CommentReplyDTO[];
              messages_data.ids.forEach((id: string) => {
                const message_idx = this.messages.findIndex(
                  (message) => message.commentId === id,
                );
                if (message_idx === -1) {
                  messages.push({
                    ...messages_data.objects.replies[id],
                    sended: true,
                  });
                }
              });

              await this.withScrollRestoration(() => {
                this.messages = messages;
              }, 'bottom');

              this.allMessages = messages_data.objects.replies;
              this.hasMoreOlder = messages_data.more;
            }
          });
      } else {
        this.messages = [];
      }

      this.$emit('update:lastViewedAt', new Date().toISOString());
      this.isLoading = false;
    },

    async startMessageEditing(message_id: string) {
      const editing_message =
        this.messages.find(
          (message: CommentReplyDTO) => message.id === message_id,
        ) ?? null;
      if (!editing_message) return;
      this.targetMessage = {
        actionType: TargetMessageActionTypes.EDIT,
        message: editing_message,
      };
    },
    async replyMessage(message_id: string) {
      const editing_message =
        this.messages.find(
          (message: CommentReplyDTO) => message.id === message_id,
        ) ?? null;
      if (!editing_message) return;
      this.targetMessage = {
        message: editing_message,
        actionType: TargetMessageActionTypes.REPLY,
      };
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
        this.expectMessageEvent = true;
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

            setTimeout(() => {
              this.expectMessageEvent = false;
            }, 0);
          });
      }
    },
    showUsername(idx: number, list: any[]) {
      if (idx === list.length - 1) return true;
      return list[idx].user.AccountId !== list[idx + 1].user.AccountId;
    },
    showUserIcon(idx: number, list: CommentReplyDTO[]) {
      if (idx === list.length - 1) return true;
      if (!list[idx - 1]) return true;
      return list[idx].user.AccountId !== list[idx - 1].user.AccountId;
    },
    revealCommentReply(reply_id: string) {
      const reply_element = window.document.getElementById('reply-' + reply_id);
      if (!reply_element) return;

      scrollIntoViewIfNeeded(reply_element, {
        behavior: 'smooth',
        scrollMode: 'if-needed',
      });
    },
    async sendMessage({ content }: { content: AssetPropValue }) {
      if (!this.currentAsset) {
        return;
      }
      if (isMessageEmpty(content)) return;

      this.$emit('sendMessage');
      if (
        !this.targetMessage ||
        this.targetMessage.actionType !== TargetMessageActionTypes.EDIT
      ) {
        await this.createMessage(content, this.targetMessage?.message.id);
      } else {
        await this.editMessage(content);
      }
      this.targetMessage = null;
    },
    async editMessage(content: AssetPropValue) {
      this.expectMessageEvent = true;
      const comment_content_to_db: any =
        typeof content === 'object' ? { ...content } : content;
      const editing_message_index = this.messages.findIndex(
        (el) => el.id === this.targetMessage?.message.id,
      );

      if (editing_message_index === -1) return;

      this.messages[editing_message_index].content = {
        '': comment_content_to_db,
      };
      this.messages[editing_message_index].sended = false;

      const res = await this.$getAppManager()
        .get(CommentManager)
        .changeReply(
          this.chatCommentBranch?.id ?? '',
          this.messages[editing_message_index].id,
          {
            content: { '': comment_content_to_db },
          },
        );
      if (res) {
        this.messages[editing_message_index] = {
          ...res,
          sended: true,
        };
      }
      setTimeout(() => {
        this.expectMessageEvent = false;
      }, 0);
    },
    async createMessage(content: AssetPropValue, answerToId?: string) {
      if (!this.currentAsset) {
        return;
      }

      this.expectMessageEvent = true;

      const comment_content_to_db: any =
        typeof content === 'object' ? { ...content } : content;

      if (this.chatCommentBranch && this.messages.length) {
        const new_message_id = 'temp-' + uuidv4();
        const new_message: CommentReplyDTO = {
          id: new_message_id,
          commentId: this.chatCommentBranch?.id ?? '',
          answerToId: answerToId ?? '',
          user: {
            AccountId: this.userInfo ? this.userInfo.id.toString() : '0',
            Name: this.userInfo ? this.userInfo.name : '',
          },
          content: { '': content },
          createdAt: new Date().toString(),
          updatedAt: new Date().toString(),
          sended: false,
          likes: [],
        };
        this.unsentMessages.unshift(new_message);
        await this.scrollToBottom();

        this.$emit('update:lastViewedAt', new Date().toISOString());

        const res = await this.$getAppManager()
          .get(CommentManager)
          .addAnswer(this.chatCommentBranch.id, {
            assetId: this.currentAsset.id,
            answerToReplyId: answerToId,
            content: { '': comment_content_to_db },
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

            this.allMessages[res.id] = res;
          }
        }
      } else {
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
          // await this.reloadMessages();
        }
      }
      setTimeout(() => {
        this.expectMessageEvent = false;
      }, 0);
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

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
