<template>
  <dialog-content class="EditFormatPreviewDialog">
    <div class="Dialog-body">
      <div class="EditFormatPreviewDialog-content">
        <div class="EditFormatPreviewDialog-preview is-panel">
          <div v-if="!preview" class="EditFormatPreviewDialog-preview-error">
            {{ $t('importExport.formats.settings.noPreviewAssetLoaded') }}
          </div>
          <pre
            v-else
            class="EditFormatPreviewDialog-preview-content tiny-scrollbars"
            >{{ preview }}</pre
          >
        </div>
      </div>
    </div>
    <div class="Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button type="button" class="is-button" @click="dialog.close()">
          {{ $t('common.dialogs.close') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {
  sampleAsset: Record<string, any> | null;
};

type DialogResult = {} | null;

export default defineComponent({
  name: 'EditFormatPreviewDialog',
  components: {
    DialogContent,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  computed: {
    preview() {
      return JSON.stringify(this.dialog.state.sampleAsset ?? {}, null, 1);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';

.EditFormatPreviewDialog {
  width: 800px;
}

.EditFormatPreviewDialog-preview {
  flex: 1;
  min-width: 100px;
}

.EditFormatPreviewDialog-preview-content {
  overflow: auto;
  height: 100%;
  margin: 0;
  min-width: 0;
}

.EditFormatPreviewDialog-content {
  margin-bottom: 20px;
  max-height: 60vh;
  display: flex;
  gap: 20px;
}
.EditFormatPreviewDialog-preview-error {
  color: var(--color-main-error);
}
</style>
