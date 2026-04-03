<template>
  <div class="ChatBlockMessage" :class="{ author: isAuthor }">
    <div v-if="!isAuthor" class="ChatBlockMessage-icon">
      <!-- <user-profile-icon></user-profile-icon> -->
    </div>
    <div class="ChatBlockMessage-content">
      <div
        v-if="!isAuthor && showUsername"
        class="ChatBlockMessage-content-username"
      >
        {{ message.user.Name }}
      </div>
      <context-menu-zone
        class="ChatBlockMessage-content-panel"
        :menu-list="menuList"
        @dblclick="$emit('reply', message.id)"
      >
        <div v-if="true" class="ChatBlockMessage-content-panel-targetMessage">
          <div class="ChatBlockMessage-content-panel-targetMessage-author">
            Test User
          </div>
          <div class="ChatBlockMessage-content-panel-targetMessage-content">
            Test text sdf sdfds sdfdsf ds
          </div>
        </div>
        <imc-presenter
          class="ChatBlockMessage-content-panel-text"
          :value="message.content['']"
          :content-id="'chat-' + message.id"
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
            :title="dateText"
          >
            {{ dateText }}
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
          @change-dropdown-state="isLikeDropdownActive = $event"
          @like="changeLike($event)"
        ></chat-block-like-button>
        <menu-button
          v-if="isAuthor"
          class="ChatBlockMessage-content-panel-menu"
        >
          <menu-list :menu-list="menuList" />
        </menu-button>
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
import MenuButton from '#components/Common/MenuButton.vue';
import MenuList from '#components/Common/MenuList.vue';
import ChatBlockLikes from './ChatBlockLikes.vue';
import ContextMenuZone from '../../../../app/components/Common/ContextMenuZone.vue';
import ChatBlockLikeButton from './ChatBlockLikeButton.vue';
import CommentManager from '../../../../app/logic/managers/CommentManager';

export default defineComponent({
  name: 'ChatBlockMessage',
  components: {
    ImcPresenter,
    MenuButton,
    MenuList,
    ChatBlockLikes,
    ContextMenuZone,
    ChatBlockLikeButton,
    // UserProfileIcon,
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
  },
  emits: ['delete', 'edit', 'reply'],
  data() {
    return {
      isLikeDropdownActive: false,
    };
  },
  computed: {
    dateText() {
      const created_at = formatDateTime(
        this.message.createdAt,
        this.uiManager.getLanguage(),
        true,
      );
      const updated_at = formatDateTime(
        this.message.updatedAt,
        this.uiManager.getLanguage(),
        true,
      );
      if (this.message.createdAt != this.message.updatedAt) {
        return `${this.$t('discussions.editedMessage')} ${created_at} (${updated_at})`;
      } else {
        return `${created_at}`;
      }
    },
    menuList() {
      return [
        {
          title: this.$t('common.dialogs.edit'),
          icon: 'edit',
          action: () => this.$emit('edit', this.message.id),
        },
        {
          title: this.$t('discussions.reply'),
          icon: 'ri-reply-fill',
          action: () => {
            this.$emit('reply', this.message.id);
          },
        },
        {
          title: this.$t('common.dialogs.delete'),
          icon: 'delete',
          danger: true,
          action: () =>
            this.$emit('delete', {
              commentId: this.message.commentId,
              replyId: this.message.id,
            }),
        },
      ];
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
  mounted() {},
  methods: {
    async changeLike(emoji: string) {
      const like_is_set_ind = this.likes.findIndex((l) => l.emoji === emoji);
      await this.setLike(like_is_set_ind > -1 ? null : emoji);
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
}
.ChatBlockMessage-icon {
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
  max-width: 75%;
  min-width: 150px;
  position: relative;

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
}
.ChatBlockMessage-content-panel-menu {
  position: absolute;
  display: none;
}
</style>
