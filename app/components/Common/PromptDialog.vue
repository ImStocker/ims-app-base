<template>
  <dialog-content
    class="PromptDialog"
    @escape-press="choose(false)"
    @enter-press="onEnterPressed"
  >
    <div class="Form">
      <div class="Dialog-header">
        {{ header }}
      </div>
      <div v-if="caption" class="Dialog-caption">
        {{ caption }}
      </div>
      <div v-if="message" class="PromptDialog-message">
        {{ message }}
      </div>
      <div class="Dialog-message">
        <FormInput
          :autofocus="true"
          :value="dialog.state.value ? dialog.state.value : undefined"
          :placeholder="dialog.state.placeholder"
          :type="dialog.state.type ?? 'text'"
          @input="value = $event"
        />
      </div>
      <div class="Form-row-buttons">
        <div
          class="Form-row-buttons-center PromptDialog-buttons use-buttons-action"
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

type DialogProps = {
  value?: string;
  placeholder?: string;
  header?: string;
  message?: string;
  caption?: string;
  yesCaption?: string;
  cancelCaption?: string;
  forbidClose?: boolean;
  type?: 'textarea' | 'text' | 'date' | 'password' | 'email' | 'tel' | 'number';
  validate?: (val: string) => string | Promise<string>;
  action?: (val: string) => Promise<any>;
};

type DialogResult = string | undefined | null;

export default defineComponent({
  name: 'PromptDialog',
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
    onEnterPressed() {
      if (this.dialog.state.type !== 'textarea') {
        this.choose(true);
      }
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
.PromptDialog {
  min-width: 400px;
}

.PromptDialog-select {
  padding: 4px 0px;
  width: 100px;
  background: white;
  border: 1px solid;
  margin-left: 10px;
}

.PromptDialog-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.PromptDialog-loadButton {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 5px 24px 5px 24px;
}

.PromptDialog-loadButton-circle {
  margin: 0;
  --loader-spinner-color1: #363633;
}

.PromptDialog-message {
  margin-bottom: 10px;
}
</style>
