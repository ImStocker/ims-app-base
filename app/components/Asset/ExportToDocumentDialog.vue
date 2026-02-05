<template>
  <dialog-content
    v-if="projectInfo"
    class="ExportToDocumentDialog"
    @escape-press="dialog.close()"
    @enter-press="dialog.close()"
  >
    <div class="Dialog-header">
      {{ dialogHeader }}
    </div>
    <div v-if="!loadingDone" class="ExportToDocumentDialog-loading">
      <div class="loaderSpinner"></div>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else-if="workspaceInfo">
      <div
        class="ExportToDocumentDialog-content-wrapper"
        data-theme="ims-light"
      >
        <div v-if="!renderingDone" class="ExportToDocumentDialog-load">
          <div class="ExportToDocumentDialog-load-content">
            <div class="loaderSpinner"></div>
            {{ $t('importExport.preparation') }}
            {{ preparationStatus }}
          </div>
        </div>
        <div class="ExportToDocumentDialog-content tiny-scrollbars">
          <div
            ref="export-content"
            class="ExportToDocumentDialog-content-inner"
            data-theme="ims-light"
          >
            <ContentToPDF
              class="AssetPreviewDialog-main-common"
              :workspace-info="workspaceInfo"
              :level="1"
              @update:render-state="renderState = $event"
            ></ContentToPDF>
          </div>
        </div>
      </div>
    </template>
    <div class="Form-row-buttons">
      <div
        class="Form-row-buttons-center ExportToDocumentDialog-buttons use-buttons-action"
      >
        <button type="button" class="is-button" @click="dialog.close()">
          {{ $t('common.dialogs.close') }}
        </button>
        <button
          type="button"
          class="is-button accent"
          :disabled="!loadingDone || !renderingDone"
          :class="{ loading: exportIsInProgress }"
          @click="doExport()"
        >
          {{ $t('gddPage.export') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import UiManager from '../../logic/managers/UiManager';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import UbuntuRegular from '$style/fonts/Ubuntu/Ubuntu-Regular.ttf';
import UbuntuBold from '$style/fonts/Ubuntu/Ubuntu-Bold.ttf';
import UbuntuItalic from '$style/fonts/Ubuntu/Ubuntu-Italic.ttf';
import UbuntuLightItalic from '$style/fonts/Ubuntu/Ubuntu-LightItalic.ttf';
import UbuntuMediumItalic from '$style/fonts/Ubuntu/Ubuntu-MediumItalic.ttf';
import UbuntuBoldItalic from '$style/fonts/Ubuntu/Ubuntu-BoldItalic.ttf';
import UbuntuLight from '$style/fonts/Ubuntu/Ubuntu-Light.ttf';
import UbuntuMedium from '$style/fonts/Ubuntu/Ubuntu-Medium.ttf';
import remixicon from 'remixicon/fonts/remixicon.ttf';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import {
  loadExportingContent,
  type ExportingContent,
  type ExportingContentRenderState,
} from '../../logic/utils/convertToPDF';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import { openBlobFile } from '../../logic/utils/dataUtils';

type DialogProps = {
  assetIds?: string[];
  workspaceId?: string;
  type: 'pdf' | 'md';
};

type DialogResult = undefined;

export default defineComponent({
  name: 'ExportToDocumentDialog',
  components: {
    DialogContent,
    ContentToPDF: defineAsyncComponent(
      () => import('./ExportToDocument/ContentToPDF.vue') as any,
    ),
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
      loadingError: null as string | null,
      loadingDone: false,
      renderState: {
        totalBlocks: 0,
        renderedBlocks: 0,
      } as ExportingContentRenderState,
      workspaceInfo: null as null | ExportingContent,
      exportIsInProgress: false,
    };
  },
  computed: {
    renderingDone() {
      return this.renderState.renderedBlocks >= this.renderState.totalBlocks;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    dialogHeader() {
      return this.$t('importExport.preview');
    },
    preparationStatus() {
      if (this.renderState.totalBlocks > 0) {
        return `(${this.renderState.renderedBlocks}/${this.renderState.totalBlocks})`;
      } else return '';
    },
    outputFileBaseName() {
      let filename = 'doc';
      if (this.workspaceInfo) {
        if (this.workspaceInfo.workspace?.title) {
          filename = this.workspaceInfo.workspace.title;
        } else if (this.workspaceInfo.assetInfos.length > 0) {
          filename = this.workspaceInfo.assetInfos[0].assetFull.title;
        }
      }
      filename = convertTranslatedTitle(filename, (key) => this.$t(key));
      return filename;
    },
  },
  async mounted() {
    this.$emit('dialog-parameters', {
      forbidClose: true,
    });
    await this.load();
  },
  methods: {
    async load() {
      this.loadingDone = false;
      this.workspaceInfo = null;
      try {
        this.workspaceInfo = await loadExportingContent(
          this.$getAppManager().get(CreatorAssetManager),
          this.dialog.state.assetIds ?? [],
          this.dialog.state.workspaceId ?? null,
        );
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.loadingDone = true;
      }
    },
    async doExport() {
      if (this.exportIsInProgress) {
        return;
      }
      this.exportIsInProgress = true;
      try {
        if (this.dialog.state.type === 'md') {
          await this.exportToMarkdown();
        } else if (this.dialog.state.type === 'pdf') {
          await this.exportToPDF();
        }
        this.dialog.close();
      } catch (err: any) {
        this.$getAppManager().get(UiManager).showError(err);
      } finally {
        this.exportIsInProgress = false;
      }
    },
    async exportToMarkdown() {
      const turndown = (await import('turndown')).default;
      const { gfm } = await import('@joplin/turndown-plugin-gfm');
      const turndownService = new turndown();
      turndownService.use(gfm);
      const element = this.$refs['export-content'] as HTMLElement;
      const markdown = turndownService.turndown(element);
      const file_title = `${this.outputFileBaseName}.md`;
      await openBlobFile(new Blob([markdown]), file_title);
    },
    async exportToPDF() {
      const { jsPDF } = await import('jspdf');
      const element = this.$refs['export-content'] as HTMLElement;
      const doc = new jsPDF({
        format: 'a4',
        unit: 'px',
        orientation: 'portrait',
        putOnlyUsedFonts: true,
        hotfixes: ['px_scaling'],
      });
      const margins = {
        top: 40,
        right: 20,
        bottom: 40,
        left: 40,
      };
      await new Promise<void>((resolve) => {
        doc.html(element, {
          html2canvas: { useCORS: true, allowTaint: true },
          callback: (doc) => {
            doc.save(`${this.outputFileBaseName}.pdf`);
            resolve();
          },
          margin: [margins.top, margins.right, margins.bottom, margins.left],
          fontFaces: [
            {
              src: [{ url: remixicon, format: 'truetype' }],
              family: 'Remixicon',
            },
            {
              src: [{ url: UbuntuMedium, format: 'truetype' }],
              family: 'Ubuntu',
              weight: 500,
              style: 'normal',
            },
            {
              src: [{ url: UbuntuItalic, format: 'truetype' }],
              family: 'Ubuntu',
              weight: 'normal',
              style: 'italic',
            },
            {
              src: [{ url: UbuntuLight, format: 'truetype' }],
              family: 'Ubuntu',
              weight: 300,
              style: 'normal',
            },
            {
              src: [{ url: UbuntuRegular, format: 'truetype' }],
              family: 'Ubuntu',
              weight: 'normal',
              style: 'normal',
            },
            {
              src: [{ url: UbuntuBold, format: 'truetype' }],
              family: 'Ubuntu',
              weight: 'bold',
              style: 'normal',
            },
            {
              src: [{ url: UbuntuLightItalic, format: 'truetype' }],
              family: 'Ubuntu',
              style: 'italic',
              weight: 300,
            },
            {
              src: [{ url: UbuntuMediumItalic, format: 'truetype' }],
              family: 'Ubuntu',
              style: 'italic',
              weight: 500,
            },
            {
              src: [{ url: UbuntuBoldItalic, format: 'truetype' }],
              family: 'Ubuntu',
              style: 'italic',
              weight: 'bold',
            },
          ],
        });
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ExportToDocumentDialog {
  color: var(--local-text-color);
  font-size: var(--local-font-size);
  padding: 20px;
  width: 800px;
}
.ExportToDocumentDialog-content-wrapper {
  position: relative;
  width: 740px;
  height: 400px;
}
.ExportToDocumentDialog-content {
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #fff !important;
  border: 4px;
  border-radius: 4px;
  width: 100%;
  position: relative;
  height: 100%;
}

.ExportToDocumentDialog-content-inner {
  --local-bg-color: #ffffff;
  --local-box-color: #fff;
  --local-font-size: 15px;
  --local-font-family: 'Ubuntu', Arial, Helvetica Neue, Helvetica, sans-serif;
  --local-text-color: #000000;
  --local-link-color: #2f6dd8;
  --local-border-color: #cccccc;
  --local-hl-bg-color: #f5f7fc;
  --local-hl-text-color: var(--local-text-color);
  --local-sub-text-color: #000000;
  &:deep(a) {
    color: #2f6dd8;
  }
  &:deep(.ql-imc-asset) {
    color: #2f6dd8;
  }
  &:deep(.AssetBlockResizer-content) {
    height: fit-content !important;
  }
}

.ExportToDocumentDialog-loading {
  text-align: center;

  .loaderSpinner {
    font-size: 16px;
  }
}

.ExportToDocumentDialog-header {
  font-weight: bold;
}

.ExportToDocumentDialog-select {
  margin: 14px 0;
}

.ExportToDocumentDialog-buttons {
  gap: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.ExportToDocumentDialog-settings {
  background: #fff;
  border-radius: 4px;
  background-image: linear-gradient(#eee 0.1em, transparent 0.1em),
    linear-gradient(90deg, #eee 0.1em, transparent 0.1em);
  background-size: 30px 30px;
  text-align: center;
  cursor: zoom-in;
}

.ExportToDocumentDialog-settings:deep(span.edgeLabel) {
  background-color: #fff !important;
}

.ExportToDocumentDialog-setting {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
  align-items: center;
}

.ExportToDocumentDialog-setting-name {
  min-width: 90px;
}

.ExportToDocumentDialog-setting-flex {
  display: flex;
  align-items: center;
}

.ExportToDocumentDialog-setting-checkbox {
  margin-right: 10px;
  cursor: pointer;
}

.ExportToDocumentDialog-setting-checkbox-label {
  width: 100%;
  cursor: pointer;
}

.ExportToDocumentDialog-messages {
  font-style: italic;
  color: #999;
}

.ExportToDocumentDialog-content-innerNo {
  text-align: center;
  color: #ccc;
  font-style: italic;
}

.ExportToDocumentDialog-Contents-header {
  font-size: 20px;
  font-weight: bold;
}

.ExportToDocumentDialog-load {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.7);
  .loaderSpinner {
    font-size: 24px;
    margin: 10px;
    --loader-spinner-color1: #000;
    --loader-spinner-color2: rgba(0, 0, 0, 0.2);
  }
}

.ExportToDocumentDialog-load-content {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: auto;
}
.ExportToDocumentDialog-loading {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
</style>
