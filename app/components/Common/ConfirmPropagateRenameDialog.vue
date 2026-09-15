<template>
  <dialog-content
    class="ConfirmPropagateRenameDialog"
    @escape-press="choose('cancel')"
  >
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
          <button type="button" class="is-button" @click="choose('current')">
            {{ currentCaption }}
          </button>
          <button type="button" class="is-button" @click="choose('cancel')">
            {{ cancelCaption }}
          </button>
          <button
            ref="input"
            type="button"
            class="is-button accent"
            @click="choose('all')"
          >
            {{ allCaption }}
          </button>
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
  allCaption?: string;
  currentCaption?: string;
  cancelCaption?: string;
};

type DialogResult = 'all' | 'current' | 'cancel';

export default defineComponent({
  name: 'ConfirmPropagateRenameDialog',
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
    allCaption() {
      return this.dialog.state.allCaption
        ? this.dialog.state.allCaption
        : this.$t('assetEditor.propsBlockPropagateRenameAll');
    },
    currentCaption() {
      return this.dialog.state.currentCaption
        ? this.dialog.state.currentCaption
        : this.$t('assetEditor.propsBlockPropagateRenameCurrent');
    },
    cancelCaption() {
      return this.dialog.state.cancelCaption
        ? this.dialog.state.cancelCaption
        : this.$t('common.dialogs.cancelCaption');
    },
  },
  mounted() {
    (this.$refs['input'] as any)?.focus();
  },
  methods: {
    choose(val: DialogResult) {
      this.dialog.close(val);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
</style>
