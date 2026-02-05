<template>
  <dialog-content
    class="AssetServiceNameDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="Form">
      <div class="Dialog-header">
        {{ header }}
      </div>
      <div v-if="caption" class="Dialog-caption">
        {{ caption }}
      </div>
      <div v-if="message" class="Dialog-message">
        {{ message }}
      </div>
      <div class="Dialog-message AssetServiceNameDialog-input">
        <FormInput
          :autofocus="true"
          :value="dialog.state.value ? dialog.state.value : undefined"
          :placeholder="dialog.state.placeholder"
          @input="value = $event"
        />
        <div class="AssetServiceNameDialog-normalizedKey">
          <i
            class="ri-price-tag-3-fill AssetServiceNameDialog-normalizedKey-icon"
          ></i>
          <a
            class="AssetServiceNameDialog-normalizedKey-value"
            href=""
            @click.prevent="copy"
          >
            {{ normalizedPropKey }}
          </a>
        </div>
      </div>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center AssetServiceNameDialog-buttons use-buttons-action"
        >
          <button
            type="button"
            :value="cancelCaption"
            class="is-button"
            :disabled="busy"
            @click="dialog.close()"
          >
            {{ cancelCaption }}
          </button>
          <button
            type="button"
            class="is-button accent"
            :class="{ loading: busy }"
            :disabled="busy"
            @click="choose(true)"
          >
            {{ yesCaption }}
          </button>
        </div>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import FormInput from '../Form/FormInput.vue';
import UiManager from '../../logic/managers/UiManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import { normalizeAssetPropPart } from '../../logic/types/Props';
import { clipboardCopyPlainText } from '../../logic/utils/clipboard';

type DialogProps = {
  value?: string;
  placeholder?: string;
  header?: string;
  message?: string;
  caption?: string;
  yesCaption?: string;
  cancelCaption?: string;
  forbidClose?: boolean;
  validate?: (val: string) => string | Promise<string>;
  action?: (val: string) => Promise<any>;
};

type DialogResult = string | undefined | null;

export default defineComponent({
  name: 'AssetServiceNameDialog',
  components: {
    DialogContent,
    FormInput,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  data() {
    return {
      value: null as string | null,
      busy: false,
    };
  },
  computed: {
    normalizedPropKey() {
      return normalizeAssetPropPart(this.value ?? '');
    },
    header() {
      return this.dialog.state.header;
    },
    message() {
      return this.dialog.state.message;
    },
    yesCaption() {
      return this.dialog.state.yesCaption
        ? this.dialog.state.yesCaption
        : this.$t('common.dialogs.yes');
    },
    cancelCaption() {
      return this.dialog.state.cancelCaption
        ? this.dialog.state.cancelCaption
        : this.$t('common.dialogs.cancelCaption');
    },
    caption() {
      return this.dialog.state.caption;
    },
  },
  mounted() {
    if (this.dialog.state.forbidClose) {
      this.$emit('dialog-parameters', {
        forbidClose: true,
      });
    }
    if (this.dialog.state.value) {
      this.value = this.dialog.state.value;
    }
  },
  methods: {
    copy() {
      clipboardCopyPlainText(this.normalizedPropKey);
    },
    async choose(ok: boolean) {
      if (ok) {
        let val = this.value ?? '';
        if (this.dialog.state.validate) {
          try {
            this.busy = true;
            val = await this.dialog.state.validate(val);
          } catch (err: any) {
            this.$getAppManager().get(UiManager).showError(err);
            return;
          } finally {
            this.busy = false;
          }
        }
        if (this.dialog.state.action) {
          try {
            this.busy = true;
            await this.dialog.state.action(val);
          } catch (err: any) {
            this.$getAppManager().get(UiManager).showError(err);
            return;
          } finally {
            this.busy = false;
          }
        }
        this.dialog.close(val);
      } else {
        this.dialog.close();
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetServiceNameDialog {
  min-width: 400px;
}

.AssetServiceNameDialog-input {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.AssetServiceNameDialog-normalizedKey {
  color: var(--local-sub-text-color);
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;

  i {
    line-height: 1;
  }

  a {
    color: var(--local-sub-text-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.AssetServiceNameDialog-select {
  padding: 4px 0px;
  width: 100px;
  background: white;
  border: 1px solid;
  margin-left: 10px;
}

.AssetServiceNameDialog-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.AssetServiceNameDialog-loadButton {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 5px 24px 5px 24px;
}

.AssetServiceNameDialog-loadButton-circle {
  margin: 0;
  --loader-spinner-color1: #363633;
}
</style>
