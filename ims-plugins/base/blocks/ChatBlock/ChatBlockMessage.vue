<template>
  <div class="ChatBlockMessage" :class="{ author: isAuthor }">
    <div class="ChatBlockMessage-comment">
      <div v-if="showUsername" class="ChatBlockMessage-comment-userName">
        {{ message.user.Name }}
      </div>
      <div class="ChatBlockMessage-comment-contentWrapper">
        <div class="ChatBlockMessage-comment-content">
          <imc-presenter
            class="ChatBlockMessage-comment-text"
            :value="message.content['']"
            :content-id="'chat-' + message.id"
          />
          <div class="ChatBlockMessage-comment-date">
            <div class="ChatBlockMessage-comment-date-text" :title="dateText">
              {{ dateText }}
            </div>
            <i v-if="!message.sended" class="ri-copper-coin-fill" />
            <i v-else class="ri-check-fill" />
          </div>
        </div>
        <menu-button v-if="isAuthor" class="ChatBlockMessage-comment-menu">
          <menu-list :menu-list="menuList" />
        </menu-button>
      </div>
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

export default defineComponent({
  name: 'ChatBlockMessage',
  components: {
    ImcPresenter,
    MenuButton,
    MenuList,
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
  computed: {
    dateText() {
      return (
        formatDateTime(
          this.message.createdAt,
          this.uiManager.getLanguage(),
          true,
        ) +
        (this.message.createdAt != this.message.updatedAt
          ? ` ${this.$t('discussions.editedMessage')} ${formatDateTime(
              this.message.updatedAt,
              this.uiManager.getLanguage(),
              true,
            )}`
          : ``)
      );
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
  },
  mounted() {},
  methods: {
    formatDateTime,
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.ChatBlockMessage {
  width: 100%;

  &:hover {
    .ChatBlockMessage-comment-menu {
      opacity: 1;
    }
  }
}

.ChatBlockMessage-comment-contentWrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}

.ChatBlockMessage-comment {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.ChatBlockMessage-comment-userName {
  font-weight: 500;
  color: var(--local-sub-text-color);
  font-size: var(--local-font-size);
  text-align: left;
  padding: 0 0 0 20px;
}

.ChatBlockMessage-comment-content {
  background-color: var(--local-bg-color);
  border: 1px solid var(--local-box-color);
  display: flex;
  padding: 10px 20px 20px;
  position: relative;
  border-radius: 20px;
  width: fit-content;
  min-width: 150px;
  max-width: 75%;
  margin: 0;

  @include devices-mixins.device-type(not-pc) {
    max-width: 90%;
    padding: 5px 20px 25px 20px;
  }

  .ChatBlockMessage-comment-date {
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    font-size: 12px;
    font-weight: bold;
    color: var(--local-sub-text-color);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    display: flex;
    gap: 5px;

    @include devices-mixins.device-type(not-pc) {
      right: 15px;
    }
  }
  .ChatBlockMessage-comment-date-text {
    flex: 1;
    min-width: 30px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.ChatBlockMessage-comment-menu {
  position: absolute;
  opacity: 0;

  @include devices-mixins.device-type(not-pc) {
    opacity: 1;
  }
}

.ChatBlockMessage.author {
  .ChatBlockMessage-comment-contentWrapper {
    justify-content: flex-end;
  }

  .ChatBlockMessage-comment-userName {
    text-align: right;
    padding: 0 20px 0 0;
  }

  .ChatBlockMessage-comment-content {
    margin: 0;
    background-color: var(--local-bg-color);
  }
}

.ChatBlockMessage-comment-text {
  max-width: 100%;
}
</style>
