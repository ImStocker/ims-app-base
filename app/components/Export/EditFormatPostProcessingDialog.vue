<template>
  <dialog-content class="EditFormatPostProcessingDialog" :loading="isLoading">
    <div v-if="loadError" class="Dialog-error">
      {{ loadError }}
    </div>
    <template v-else>
      <div class="Dialog-body">
        <div class="EditFormatPostProcessingDialog-customTip">
          {{ $t('importExport.formats.settings.enterCustomCode') }}
        </div>
        <div class="EditFormatPostProcessingDialog-content">
          <div class="EditFormatPostProcessingDialog-edit">
            <div
              ref="codeEditor"
              class="EditFormatPostProcessingDialog-edit-area is-panel tiny-scrollbars"
            ></div>
          </div>
          <div class="EditFormatPostProcessingDialog-preview is-panel">
            <div
              v-if="!dialog.state.sampleAsset"
              class="EditFormatPostProcessingDialog-preview-error"
            >
              {{ $t('importExport.formats.settings.noPreviewAssetLoaded') }}
            </div>
            <div
              v-else-if="previewError"
              class="EditFormatPostProcessingDialog-preview-error"
            >
              {{ previewError }}
            </div>
            <pre
              v-else
              class="EditFormatPostProcessingDialog-preview-content tiny-scrollbars"
              >{{ preview }}</pre
            >
          </div>
        </div>
      </div>
    </template>
    <div class="Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button type="button" class="is-button" @click="dialog.close()">
          {{ $t('common.dialogs.cancel') }}
        </button>
        <button
          v-if="!loadError"
          type="button"
          class="is-button accent EditFormatPostProcessingDialog-button-ok"
          @click="save"
        >
          {{ $t('common.dialogs.ok') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import LocalFsSyncManager from '../../logic/managers/LocalFsSyncManager';

import { basicSetup } from 'codemirror';

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import UiManager from '../../logic/managers/UiManager';

type DialogProps = {
  sampleAsset: Record<string, any> | null;
  jscode: string;
};

type DialogResult = {
  jscode: string;
} | null;

export default defineComponent({
  name: 'EditFormatPostProcessingDialog',
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
  data() {
    return {
      jscode: this.dialog.state.jscode,
      isLoading: false,
      loadError: null as string | null,
      preview: '',
      previewError: null as string | null,
      previewLoading: false,
      editorView: null as EditorView | null,
    };
  },
  computed: {
    colorTheme() {
      return this.$getAppManager().get(UiManager).getColorTheme();
    },
  },
  watch: {
    jscode() {
      this.updatePreview();
    },
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    await this.updatePreview();
    this.initCodeEditor();
  },
  unmounted() {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  },
  methods: {
    initCodeEditor() {
      const editorElement = this.$refs.codeEditor as HTMLElement;
      if (!editorElement) return;

      const editor_extensions = [
        basicSetup,
        javascript(),
        EditorView.domEventHandlers({
          blur: (event, view) => {
            const new_code = view.state.doc.toString();
            if (this.jscode !== new_code) {
              this.jscode = new_code;
              this.updatePreview();
            }
          },
        }),
      ];

      if (this.colorTheme === 'ims-dark') {
        editor_extensions.push(oneDark);
      }

      const state = EditorState.create({
        doc: this.jscode ? this.jscode : 'return asset_data;',
        extensions: editor_extensions,
      });

      this.editorView = new EditorView({
        state,
        parent: editorElement,
      });
    },
    async updatePreview() {
      if (this.isLoading || this.loadError) return;
      this.previewLoading = true;
      this.previewError = null;
      try {
        this.preview = '';
        if (this.dialog.state.sampleAsset) {
          const prepared_objs = await this.$getAppManager()
            .get(LocalFsSyncManager)
            .getUserCodeExecutorManager()
            .formatAssetsByCode([this.dialog.state.sampleAsset], this.jscode);
          this.preview = JSON.stringify(prepared_objs[0] ?? {}, null, 1);
        }
      } catch (err: any) {
        this.previewError = err.message;
      } finally {
        this.previewLoading = false;
      }
    },
    async save() {
      this.dialog.close({
        jscode: this.jscode,
      });
    },
  },
});
</script>
<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
@use '$style/scrollbars-mixins';

.EditFormatPostProcessingDialog {
  width: 1100px;
}
.EditFormatPostProcessingDialog-edit {
  flex: 1.2;
}

.EditFormatPostProcessingDialog-preview {
  flex: 1;
}

.EditFormatPostProcessingDialog-edit,
.EditFormatPostProcessingDialog-preview {
  min-width: 100px;
}

.EditFormatPostProcessingDialog-content {
  max-height: 60vh;
  display: flex;
  gap: 20px;
}

.EditFormatPostProcessingDialog-preview-content {
  overflow: auto;
  height: 100%;
  margin: 0;
  min-width: 0;
}

.EditFormatPostProcessingDialog-content {
  margin-bottom: 20px;
}
.EditFormatPostProcessingDialog-edit-area {
  width: 100%;
  height: 100%;
  min-height: 250px;
  overflow: auto;
  font-family: monospace;
  padding: 0;

  :deep(.cm-editor) {
    background: transparent;
    height: 100%;
  }

  :deep(.cm-gutters) {
    background: transparent;
  }
  :deep(.cm-focused) {
    outline: none;
  }
}
.EditFormatPostProcessingDialog-customTip {
  text-align: center;
  margin-bottom: 20px;
}
.EditFormatPostProcessingDialog-preview-error {
  color: var(--color-main-error);
}

.EditFormatPostProcessingDialog-edit-area:deep(.cm-scroller) {
  @include scrollbars-mixins.tiny-scrollbars;
}
</style>
