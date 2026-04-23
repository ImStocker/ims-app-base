<template>
  <div class="ChatBlockSend">
    <div v-if="targetMessage" class="ChatBlockSend-targetMessage">
      <div class="ChatBlockSend-targetMessage-icon">
        <i v-if="isEdit" class="ri-pencil-line"></i>
        <i v-else-if="isReply" class="ri-reply-line"> </i>
      </div>
      <div class="ChatBlockSend-targetMessage-contentWrapper">
        <div class="ChatBlockSend-targetMessage-content-actionType">
          <span v-if="isEdit">
            {{ $t('discussions.editingMessage') }}
          </span>
          <span v-else-if="isReply">
            {{ $t('discussions.replyTo') }}
            <span
              class="ChatBlockSend-targetMessage-content-actionType-userName"
              >{{ targetMessage.message.user.Name }}</span
            >
          </span>
        </div>
        <imc-presenter
          class="ChatBlockSend-targetMessage-content tiny-scrollbars"
          :value="targetMessageContent"
        ></imc-presenter>
      </div>
      <button class="ChatBlockSend-targetMessage-cancel" @click="cancel">
        <i class="ri-close-large-line"></i>
      </button>
    </div>
    <div class="ChatBlockSend-sendForm">
      <file-attach-button
        :multiple="true"
        :display-mode="'icon'"
        class="ChatBlockSend-button file"
        @uploaded-one="attachFile($event)"
      />
      <imc-editor
        ref="editor"
        v-model="message"
        class="ChatBlockSend-sendForm-input tiny-scrollbars"
        :placeholder="$t('discussions.placeholder')"
        :max-height="200"
        @enter="sendMessage()"
      />
      <button class="ChatBlockSend-button send" @click="sendMessage()">
        <i class="ri-send-plane-fill" />
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import FileAttachButton from '../../../../app/components/File/FileAttachButton.vue';
import ImcEditor from '../../../../app/components/ImcText/ImcEditor.vue';
import {
  joinAssetPropValueTexts,
  type AssetPropType,
  type AssetPropValue,
  type AssetPropValueFile,
} from '../../../../app/logic/types/Props';

import {
  getTargetMessageContent,
  TargetMessageActionTypes,
  type TargetMessage,
} from './ChatBlock';
import ImcPresenter from '../../../../app/components/ImcText/ImcPresenter.vue';

export default defineComponent({
  name: 'ChatBlockSend',
  components: {
    FileAttachButton,
    ImcEditor,
    ImcPresenter,
  },
  props: {
    targetMessage: {
      type: Object as PropType<TargetMessage | null>,
      default: null,
    },
  },
  emits: ['send', 'update:target-message'],
  data() {
    return {
      message: {} as AssetPropValue,
    };
  },
  computed: {
    messageIsEmpty() {
      return typeof this.message === 'object'
        ? !Object.keys(this.message as any).length
        : !this.message;
    },
    isEdit() {
      return this.targetMessage?.actionType === TargetMessageActionTypes.EDIT;
    },
    isReply() {
      return this.targetMessage?.actionType === TargetMessageActionTypes.REPLY;
    },
    targetMessageContent() {
      if (!this.targetMessage) {
        return null;
      }
      return getTargetMessageContent(this.targetMessage.message.content['']);
    },
  },
  watch: {
    async targetMessage() {
      if (
        this.targetMessage &&
        this.targetMessage.actionType === TargetMessageActionTypes.EDIT &&
        this.targetMessage?.message.content['']
      ) {
        this.message = this.targetMessage.message.content[''];
      } else {
        this.message = {} as AssetPropValue;
      }

      if (this.targetMessage) {
        await this.$nextTick();
        (this.$refs.editor as InstanceType<typeof ImcEditor>).focusEnd();
      }
    },
  },
  methods: {
    cancel() {
      this.$emit('update:target-message', null);
    },
    attachFile(file: AssetPropValueFile) {
      if (!file) return;
      let res = this.message;
      if (res) {
        res = joinAssetPropValueTexts(res, file);
      } else res = file;
      this.message = res;
    },
    sendMessage() {
      this.$emit('send', { content: this.message });
      this.message = {} as AssetPropType;
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/scrollbars-mixins.scss';

.ChatBlockSend {
  display: flex;
  flex-direction: column;
  background: var(--local-bg-color);
  border: 1px solid var(--local-border-color);
  border-radius: 12px;
  --ChatBlockSend-padding: 5px;
}
.ChatBlockSend-targetMessage {
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--local-border-color);
  gap: 10px;
  padding: var(--ChatBlockSend-padding) 10px;
}
.ChatBlockSend-targetMessage-icon {
  font-size: 24px;
  color: var(--local-link-color);
}
.ChatBlockSend-targetMessage-contentWrapper {
  flex: 1;
}
.ChatBlockSend-targetMessage-content-actionType {
  color: var(--local-link-color);
  font-size: 14px;
  line-height: 1.5;

  .ChatBlockSend-targetMessage-content-actionType-userName {
    font-weight: 500;
  }
}
.ChatBlockSend-targetMessage-content {
  max-height: 100px;
  overflow: auto;
}
.ChatBlockSend-targetMessage-cancel {
  border: none;
  cursor: pointer;
  background-color: transparent;
  color: var(--local-sub-text-color);
  transition: color 0.2s;

  &:hover {
    color: var(--local-text-color);
  }
}

.ChatBlockSend-sendForm {
  background-color: transparent;
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: var(--ChatBlockSend-padding);

  .ChatBlockSend-sendForm-input {
    font-size: 16px;
    width: 100%;
    margin: auto 5px;

    :deep(.ql-editor) {
      @include scrollbars-mixins.tiny-scrollbars;
    }
  }

  .ChatBlockSend-button {
    cursor: pointer;
    line-height: 1;
    font-size: 18px;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background-color: transparent;
    transition:
      color 0.2s,
      background-color 0.2s;
    color: var(--color-placeholder);

    &:hover {
      color: var(--local-text-color);
    }

    &.file {
      padding: 10px 5px;
      border: none;
    }

    &.send {
      background-color: var(--root-bg-color);

      &:hover {
        background-color: var(--color-accent);
        color: var(--local-text-on-primary-color);
      }
    }

    i {
      transform: translate(-1px, 1px);
      display: block;
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
</style>
