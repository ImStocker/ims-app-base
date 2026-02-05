<template>
  <dialog-content
    class="PromptDialog"
    @escape-press="choose(false)"
    @enter-press="choose(true)"
  >
    <div class="ConfirmDialog">
      <div class="Form">
        <div class="Dialog-header">
          {{ header }}
        </div>
        <div class="Dialog-message">
          <div v-for="(line, line_ind) of messageLines" :key="line_ind">
            <template v-if="line">
              <caption-string :value="line"></caption-string></template
            ><template v-else> &nbsp; </template>
          </div>
        </div>
        <div class="Form-row-buttons">
          <div class="Form-row-buttons-center use-buttons-action">
            <input
              v-if="withCancel"
              type="button"
              :value="cancelCaption"
              class="is-button"
              @click="choose(null)"
            />
            <button type="button" class="is-button" @click="choose(false)">
              {{ noCaption }}
            </button>
            <button
              ref="input"
              type="button"
              class="is-button"
              :class="danger ? 'danger' : 'accent'"
              @click="choose(true)"
            >
              {{ yesCaption }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import CaptionString from './CaptionString.vue';

type DialogProps = {
  header?: string;
  message?: string;
  yesCaption?: string;
  cancelCaption?: string;
  errorMessage?: string;
  withCancel?: boolean;
  danger?: boolean;
  noCaption?: string;
  forbidClose?: boolean;
};

type DialogResult = boolean | null;

export default defineComponent({
  name: 'ConfirmDialog',
  components: {
    DialogContent,
    CaptionString,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  computed: {
    messageLines() {
      return this.dialog.state.message
        ? this.dialog.state.message.split('\n')
        : [];
    },
    header() {
      return this.dialog.state.header;
    },
    errorMessage() {
      return this.dialog.state.errorMessage;
    },
    danger() {
      return this.dialog.state.danger;
    },
    withCancel() {
      return this.dialog.state.withCancel;
    },
    yesCaption() {
      return this.dialog.state.yesCaption
        ? this.dialog.state.yesCaption
        : this.$t('common.dialogs.yes');
    },
    noCaption() {
      return this.dialog.state.noCaption
        ? this.dialog.state.noCaption
        : this.$t('common.dialogs.no');
    },
    cancelCaption() {
      return this.dialog.state.cancelCaption
        ? this.dialog.state.cancelCaption
        : this.$t('common.dialogs.cancelCaption');
    },
    forbidClose() {
      return this.dialog.state.forbidClose;
    },
  },
  mounted() {
    if (this.forbidClose) {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('dialog-parameters', {
        forbidClose: true,
      });
    }

    (this.$refs['input'] as any).focus();
  },
  methods: {
    choose(val: boolean | null) {
      this.dialog.close(val);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
</style>
