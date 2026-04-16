<template>
  <div
    class="ChatBlockMessage"
    :class="{ author: isAuthor }"
    :style="messageStyle"
  >
    <user-profile-icon
      v-if="!isAuthor"
      :user="message.user"
      class="ChatBlockMessage-icon"
      :class="{ hidden: !showUserIcon }"
    ></user-profile-icon>
    <div class="ChatBlockMessage-content">
      <div
        v-if="!isAuthor && showUsername"
        class="ChatBlockMessage-content-username"
      >
        {{ message.user.Name }}
      </div>
      <context-menu-zone
        ref="contextZone"
        class="ChatBlockMessage-content-panel"
        :menu-list="menuList"
        @dblclick="$emit('reply', message.id)"
        @touchstart="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @dropdown-state-change="onContextMenuStateChange($event)"
      >
        <div
          v-if="targetMessage"
          class="ChatBlockMessage-content-panel-targetMessage"
          @click="$emit('target-message-click', targetMessage.id)"
        >
          <div class="ChatBlockMessage-content-panel-targetMessage-author">
            {{ targetMessage.user.Name }}
          </div>
          <imc-presenter
            class="ChatBlockMessage-content-panel-targetMessage-content"
            :value="targetMessageContent"
            @view-ready="targetMessageViewReady = true"
          >
          </imc-presenter>
        </div>
        <imc-presenter
          class="ChatBlockMessage-content-panel-text"
          :value="message.content['']"
          :content-id="'chat-' + message.id"
          @view-ready="messageViewReady = true"
        />
        <chat-block-likes
          class="ChatBlockMessage-content-panel-likes"
          :likes="message.likes"
          :is-author="isAuthor"
          @like="changeLike($event)"
        ></chat-block-likes>
        <div class="ChatBlockMessage-content-panel-meta">
          <div
            class="ChatBlockMessage-content-panel-meta-date"
            :title="messageDate.fullInfo"
          >
            {{ messageDate.shortInfo }}
          </div>
          <div
            v-if="isAuthor"
            class="ChatBlockMessage-content-panel-meta-status"
          >
            <i v-if="!message.sended" class="ri-copper-coin-fill" />
            <i v-else class="ri-check-fill" />
          </div>
        </div>
        <chat-block-like-button
          class="ChatBlockMessage-content-panel-like"
          :class="{ active: isLikeDropdownActive }"
          @dropdown-state-change="isLikeDropdownActive = $event"
          @like="changeLike($event)"
        ></chat-block-like-button>
        <div
          class="ChatBlockMessage-content-panel-reply"
          :style="replyIconStyle"
        >
          <i class="ri-reply-fill"></i>
        </div>
        <template #item-reactions>
          <select-smile-dropdown-content
            @input="onSmileDropdownInput"
          ></select-smile-dropdown-content>
        </template>
      </context-menu-zone>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { CommentReplyDTO } from '#logic/types/CommentTypes';
import ImcPresenter from '#components/ImcText/ImcPresenter.vue';
import AuthManager from '#logic/managers/AuthManager';
import { formatDateTime } from '#logic/utils/format';
import UiManager from '#logic/managers/UiManager';
import ChatBlockLikes from './ChatBlockLikes.vue';
import ContextMenuZone from '../../../../app/components/Common/ContextMenuZone.vue';
import ChatBlockLikeButton from './ChatBlockLikeButton.vue';
import CommentManager from '../../../../app/logic/managers/CommentManager';
import { getTargetMessageContent } from './ChatBlock';
import UserProfileIcon from '../../../../app/components/Common/UserProfileIcon.vue';
import type { MenuListItem } from '../../../../app/logic/types/MenuList';
import ProjectManager from '../../../../app/logic/managers/ProjectManager';
import SelectSmileDropdownContent from '../../../../app/components/Form/SelectSmileDropdownContent.vue';
import dayjs from 'dayjs';

const SWIPE_THRESHOLD = 25; // px for «reply» activation
const SWIPE_MAX_OFFSET = 55; // px for swipe limitation

const LONG_PRESS_DELAY = 500; // ms for long press
const DOUBLE_TAP_DELAY = 300; // ms between taps
const MOVE_THRESHOLD = 5;

export default defineComponent({
  name: 'ChatBlockMessage',
  components: {
    ImcPresenter,
    ChatBlockLikes,
    ContextMenuZone,
    ChatBlockLikeButton,
    UserProfileIcon,
    SelectSmileDropdownContent,
  },
  props: {
    message: {
      type: Object as PropType<CommentReplyDTO>,
      required: true,
    },
    showUsername: {
      type: Boolean,
      default: true,
    },
    showUserIcon: {
      type: Boolean,
      default: true,
    },
    allMessages: {
      type: Object as PropType<{ [key: string]: CommentReplyDTO } | undefined>,
      default: () => {},
    },
  },
  emits: ['delete', 'edit', 'reply', 'target-message-click', 'view-ready'],
  data() {
    return {
      messageViewReady: false,
      targetMessageViewReady: false,
      isLikeDropdownActive: false,
      isContextMenuActive: false,
      touchContext: null as {
        startX?: number;
        startY?: number;
        startTime?: number;
        lastTapTime?: number;
        swipeOffset?: number;
        moveBlocked?: boolean;
        longPressTimer?: null | NodeJS.Timeout;
      } | null,
    };
  },
  computed: {
    messageStyle() {
      if (this.touchContext && this.touchContext.swipeOffset) {
        return {
          transform: `translateX(${this.touchContext.swipeOffset}px)`,
        };
      }
      return null;
    },
    replyIconStyle() {
      if (this.touchContext && this.touchContext.swipeOffset) {
        return {
          opacity: `${Math.min((Math.abs(this.touchContext.swipeOffset) / SWIPE_THRESHOLD) * 100, 100)}%`,
        };
      }
      return {
        opacity: '0',
      };
    },
    targetMessage() {
      if (this.allMessages) {
        return this.allMessages[this.message.answerToId];
      }
      return null;
    },
    targetMessageContent() {
      if (!this.targetMessage) {
        return null;
      }
      return getTargetMessageContent(this.targetMessage.content['']);
    },
    isAdmin() {
      return this.$getAppManager().get(ProjectManager).isAdmin();
    },
    messageDate() {
      const created_at_date = new Date(this.message.createdAt);

      const is_today =
        new Date().toDateString() === created_at_date.toDateString();
      const created_at_full = formatDateTime(
        this.message.createdAt,
        this.uiManager.getLanguage(),
        true,
      );
      const updated_at_full = formatDateTime(
        this.message.updatedAt,
        this.uiManager.getLanguage(),
        true,
      );

      let full_date_info = `${this.$t('discussions.sendedMessage')}: ${created_at_full}`;
      let short_date_info = is_today
        ? dayjs(created_at_date).format('HH:MM')
        : created_at_full;

      if (this.message.createdAt != this.message.updatedAt) {
        full_date_info += `\n${this.$t('discussions.editedMessage')}: ${updated_at_full}`;
        short_date_info =
          this.$t('discussions.editedMessageShort') + ' ' + short_date_info;
      }

      return {
        fullInfo: full_date_info,
        shortInfo: short_date_info,
      };
    },
    isMessageViewReady() {
      if (this.targetMessage) {
        return this.messageViewReady && this.targetMessageViewReady;
      } else {
        return this.messageViewReady;
      }
    },
    menuList() {
      return [
        {
          title: this.$t('discussions.reaction'),
          icon: 'ri-user-smile-line',
          action: () => {},
          children: [
            {
              name: 'reactions',
            },
          ],
        },
        this.isAuthor
          ? {
              title: this.$t('common.dialogs.edit'),
              icon: 'edit',
              action: () => this.$emit('edit', this.message.id),
            }
          : null,
        {
          title: this.$t('discussions.reply'),
          icon: 'ri-reply-fill',
          action: () => {
            this.$emit('reply', this.message.id);
          },
        },
        this.isAuthor || this.isAdmin
          ? {
              title: this.$t('common.dialogs.delete'),
              icon: 'delete',
              danger: true,
              action: () =>
                this.$emit('delete', {
                  commentId: this.message.commentId,
                  replyId: this.message.id,
                }),
            }
          : null,
      ].filter((x) => x) as MenuListItem[];
    },
    userInfo() {
      return this.$getAppManager().get(AuthManager).getUserInfo();
    },
    uiManager() {
      return this.$getAppManager().get(UiManager);
    },
    isAuthor() {
      if (!this.userInfo) return false;
      return this.message.user.AccountId === this.userInfo.id.toString();
    },
    likes() {
      return this.message.likes;
    },
  },
  watch: {
    isMessageViewReady() {
      if (this.isMessageViewReady) {
        this.$emit('view-ready');
      }
    },
  },
  mounted() {},
  methods: {
    onSmileDropdownInput(emoji: string) {
      this.changeLike(emoji);
    },
    onContextMenuStateChange(state: boolean) {
      if (state) {
        if (this.touchContext) this.touchContext.moveBlocked = true;
      } else {
        if (this.touchContext) this.touchContext.moveBlocked = false;
      }
    },
    onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];

      this.touchContext = {
        ...this.touchContext,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        swipeOffset: 0,
        longPressTimer: setTimeout(() => {
          if (this.touchContext && !this.touchContext?.swipeOffset) {
            const context_menu = this.$refs['contextZone'] as
              | InstanceType<typeof ContextMenuZone>
              | undefined;
            if (context_menu) {
              context_menu.onContextMenu(e);
              e.stopPropagation();
            }
          }
        }, LONG_PRESS_DELAY),
      };
    },
    onTouchEnd(_e: TouchEvent) {
      if (!this.touchContext) return;
      const endTime = Date.now();
      const holdTime = endTime - (this.touchContext.startTime ?? 0);

      if (this.touchContext.longPressTimer) {
        clearTimeout(this.touchContext.longPressTimer);
        this.touchContext.longPressTimer = null;
      }

      if (Math.abs(this.touchContext.swipeOffset ?? 0) > SWIPE_THRESHOLD) {
        this.$emit('reply', this.message.id);
      } else if (
        !this.touchContext.swipeOffset &&
        holdTime < LONG_PRESS_DELAY
      ) {
        const timeSinceLastTap = endTime - (this.touchContext.lastTapTime ?? 0);

        if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
          this.setLike('heart');
          this.touchContext.lastTapTime = 0;
        } else {
          this.touchContext.lastTapTime = endTime;
        }
      }

      this.touchContext.swipeOffset = 0;
    },
    onTouchMove(e: TouchEvent) {
      if (!this.touchContext || this.touchContext.moveBlocked) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - (this.touchContext.startX ?? 0);

      if (Math.abs(deltaX) > MOVE_THRESHOLD || this.touchContext.swipeOffset) {
        if (this.touchContext.longPressTimer) {
          clearTimeout(this.touchContext.longPressTimer);
          this.touchContext.longPressTimer = null;
        }

        if (deltaX <= 0) {
          if (Math.abs(deltaX) > SWIPE_MAX_OFFSET) {
            return;
          }
          this.touchContext.swipeOffset = Math.min(deltaX, 180);
        } else {
          this.touchContext.swipeOffset = 0;
        }
      }
    },
    async changeLike(emoji: string) {
      const like_is_set_ind = this.likes.findIndex((l) => l.emoji === emoji);
      await this.setLike(like_is_set_ind > -1 ? '' : emoji);
      if (like_is_set_ind > -1) {
        this.likes.splice(like_is_set_ind, 1);
      } else if (this.userInfo) {
        this.likes.push({
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
    formatDateTime,
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';
.ChatBlockMessage {
  display: flex;
  width: 100%;

  &.author {
    justify-content: flex-end;
    --local-bg-color: var(--local-box-color);
    .ChatBlockMessage-content {
      align-items: flex-end;
    }
  }
  &:not(.author) {
    .ChatBlockMessage-content-panel-like {
      right: -5px;
      left: auto;
    }
  }
}

.ChatBlockMessage-content-panel-reply {
  position: absolute;
  right: -35px;
  line-height: 1;
  display: flex;
  border-radius: 999px;
  padding: 5px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--local-hl-bg-color);
}
.ChatBlockMessage-icon {
  width: 30px;
  height: 30px;
  margin: auto 5px 5px 0;
  background-color: var(--color-accent);
  color: var(--local-text-on-primary-color);

  &.hidden {
    opacity: 0;
    visibility: 0;
  }
}
.ChatBlockMessage-content {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

.ChatBlockMessage-content-username {
  color: var(--local-sub-text-color);
  font-weight: bold;
  padding: 0 20px;
}

.ChatBlockMessage-content-panel {
  border: 1px solid var(--local-border-color);
  background-color: var(--local-bg-color);
  border-radius: 20px;
  padding: 10px 20px 5px;
  min-width: 150px;
  position: relative;
  will-change: transform;

  &:hover {
    .ChatBlockMessage-content-panel-like {
      opacity: 1;
    }
  }
}

.ChatBlockMessage-content-panel-targetMessage {
  background-color: var(--local-link-bg-color);
  padding: 5px;
  border-radius: 4px 8px 8px 4px;
  border-left: 4px solid var(--local-link-color);
  cursor: pointer;

  .ChatBlockMessage-content-panel-targetMessage-author {
    color: var(--local-link-color);
    font-weight: bold;
  }
}

.ChatBlockMessage-content-panel-meta {
  color: var(--local-sub-text-color);
  display: flex;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  gap: 5px;
  overflow: hidden;
  white-space: nowrap;
  justify-content: flex-end;
}
.ChatBlockMessage-content-panel-meta-date {
  min-width: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ChatBlockMessage-content-panel-likes {
  display: flex;
  gap: 5px;
}
.ChatBlockMessage-content-panel-like {
  width: fit-content;
  position: absolute;
  left: 0;
  bottom: 0;
  transform: translate(0, 50%);
  transition: opacity 0.2s;

  &:not(.active) {
    opacity: 0;
  }

  @include devices-mixins.device-type(not-pc) {
    display: none;
  }
}
.ChatBlockMessage-content-panel-menu {
  position: absolute;
  display: none;
}
</style>
