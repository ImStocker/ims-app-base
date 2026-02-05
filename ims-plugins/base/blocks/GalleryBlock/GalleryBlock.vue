<template>
  <div
    class="GalleryBlock"
    :class="{
      'state-drag-ok': dragEffect === 1,
      'state-drag-error': dragEffect === -1,
    }"
    @drop.prevent="dropFile"
    @dragover.prevent="dragFileEnter"
    @dragleave.prevent="dragFileLeave"
  >
    <div v-if="galleryItems.length > 0" class="GalleryBlock-items">
      <sortable-list
        class="GalleryBlock-list"
        handle-selector=".GalleryBlock-item"
        id-key="key"
        :list="galleryItems"
        :disabled="readonly"
        @update:list="changeList($event)"
      >
        <template #default="{ item }">
          <screenshot-renderer
            :disabled="true"
            :ready="true"
            @vue:mounted="readyStates.set(item.key, false)"
            @rendering-done="readyStates.set(item.key, $event)"
            @vue:unmounted="readyStates.delete(item.key)"
          >
            <gallery-block-item
              :key="item.key"
              class="GalleryBlock-item"
              :readonly="readonly"
              :item="item"
              :files="filesForGallery"
              @delete="deleteImage(item)"
            ></gallery-block-item>
          </screenshot-renderer>
        </template>
        <template #append>
          <div
            v-if="uploadProgressPercent !== null"
            class="GalleryBlock-uploadProgressPercent"
          >
            <div
              class="GalleryBlock-uploadProgressPercent-bar"
              :style="{
                transform: `scaleY(${uploadProgressPercent}%)`,
              }"
            ></div>
            <div class="GalleryBlock-uploadProgressPercent-content">
              {{ $t('file.uploading') }}
              <br />
              {{ uploadProgressPercent }}%
            </div>
          </div>
        </template>
      </sortable-list>
    </div>
    <div v-if="!readonly" class="GalleryBlock-add">
      <menu-button
        v-if="!readonly"
        class="use-buttons-action"
        :tooltip="$t('assetEditor.galleryBlockAdd')"
        @show="enterEditMode()"
        @hide="exitEditMode()"
      >
        <template #button="{ tooltip, show }">
          <button
            ref="addButton"
            class="is-button"
            :title="tooltip"
            @click="show"
          >
            {{ $t('mainMenu.add') }}
          </button>
        </template>
        <menu-list :menu-list="menuList"></menu-list>
      </menu-button>
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        :accept="fileAccept"
        multiple
        @change="handleFile"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import UiManager from '#logic/managers/UiManager';
import type {
  AssetDisplayMode,
  ResolvedAssetBlock,
} from '#logic/utils/assets';
import {
  extractGalleryBlockEntries,
  type GalleryBlockExtractedEntries,
  type GalleryBlockItemObject,
} from './GalleryBlock';
import GalleryBlockItem from './GalleryBlockItem.vue';
import {
  encodeAssetPropPartWithCapitals,
  makeBlockRef,
  normalizeAssetPropPart,
} from '#logic/types/Props';
import MenuButton from '#components/Common/MenuButton.vue';
import DialogManager from '#logic/managers/DialogManager';
import { nodeContainsElement } from '#components/utils/DomElementUtils';
import SortableList from '#components/Common/SortableList.vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import ExternalLinkDialog from './ExternalLinkDialog.vue';
import MenuList from '#components/Common/MenuList.vue';
import { getClipboardImagesContent } from '#logic/utils/clipboard';
import type { AssetChanger } from '#logic/types/AssetChanger';
import ScreenshotRenderer from '#components/Common/ScreenshotRenderer.vue';
import type { UploadingJob } from '#logic/managers/EditorManager';
import EditorManager from '#logic/managers/EditorManager';
import { getNextIndexWithTimestamp } from '#components/Asset/Editor/blockUtils';

const AllowedExtensions = new Set(['jpg', 'jpeg', 'png', 'bmp', 'svg', 'gif']);

export default defineComponent({
  name: 'GalleryBlock',
  components: {
    GalleryBlockItem,
    MenuButton,
    SortableList,
    MenuList,
    ScreenshotRenderer,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['save', 'view-ready'],
  data() {
    return {
      dragEffect: 0,
      uploadJob: null as UploadingJob | null,
      uploadTotal: 0,
      uploadDone: 0,
      readyStates: new Map<string, boolean>(),
    };
  },
  computed: {
    viewReady() {
      return [...this.readyStates.values()].every((x) => x);
    },
    menuList() {
      return [
        {
          title: this.$t('assetEditor.galleryBlockAddFileFromComputer'),
          action: this.selectFiles,
          icon: 'file',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddVideoLink'),
          action: this.addVideoLink,
          icon: 'video',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddExternalImage'),
          action: this.addImageLink,
          icon: 'image',
        },
        {
          title: this.$t('assetEditor.galleryBlockPasteFromBuffer'),
          action: this.getFileFromBuffer,
          icon: 'ri-clipboard-line',
        },
      ];
    },
    filesForGallery() {
      const filtered_items = this.galleryItems;
      if (!filtered_items || !filtered_items.length) {
        return undefined;
      }
      return this.galleryItems;
    },
    fileAccept() {
      return [...AllowedExtensions].map((x) => `.${x}`).join(',');
    },
    realEntries(): GalleryBlockExtractedEntries {
      return extractGalleryBlockEntries(this.resolvedBlock);
    },
    galleryItems(): GalleryBlockItemObject[] {
      return this.realEntries.list;
    },
    projectId() {
      return this.assetBlockEditor.projectInfo.id;
    },
    uploadProgressPercent() {
      if (this.uploadTotal <= 0) {
        return null;
      }
      const val =
        (this.uploadDone + (this.uploadJob ? this.uploadJob.progress : 0)) /
        this.uploadTotal;
      return Math.round(val * 100);
    },
    getProjectInfo(): any {
      return this.assetBlockEditor.projectInfo;
    },
  },
  watch: {
    viewReady() {
      this.$emit('view-ready', this.viewReady);
    },
  },
  methods: {
    enterEditMode() {
      if (this.readonly) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      if (!this.$refs.addButton) return;
      (this.$refs.addButton as HTMLButtonElement).click();
    },
    exitEditMode() {
      this.assetBlockEditor.exitEditMode();
    },
    changeList(reordered_blocks: GalleryBlockItemObject[]) {
      if (this.readonly) {
        return;
      }
      const op = this.assetChanger.makeOpId();
      for (let i = 0; i < reordered_blocks.length; i++) {
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          {
            [`${reordered_blocks[i].key}\\index`]: i,
          },
          op,
        );
      }
      this.$emit('save');
    },
    showError(error: any) {
      this.$getAppManager().get(UiManager).showError(error);
    },
    async uploadFiles(files: { blob: Blob; name: string }[]) {
      this.uploadTotal += files.length;
      for (const file of files) {
        try {
          await this.uploadBlob(file.blob, file.name);
        } finally {
          this.uploadJob = null;
          this.uploadDone++;
        }
      }
      if (this.uploadTotal === this.uploadDone) {
        this.uploadTotal = 0;
        this.uploadDone = 0;
      }
    },
    async uploadBlob(blob: Blob, file_name: string) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.uploadJob = this.$getAppManager()
            .get(EditorManager)
            .attachFile(blob, file_name);
          const res = await this.uploadJob.awaitResult();
          if (!res) return;

          const new_key = res.FileId;
          this.assetChanger.setBlockPropKeys(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            {
              [`${new_key}\\value`]: res,
              [`${new_key}\\type`]: 'file',
              [`${new_key}\\index`]: getNextIndexWithTimestamp(
                this.realEntries.maxIndex,
              ),
            },
          );
          this.save();
        });
    },
    async processFiles(files: File[]) {
      const files_to_upload: { blob: Blob; name: string }[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        if (!ext || !AllowedExtensions.has(ext.toLowerCase())) {
          this.showError(
            this.$t('file.errorUnsupportedFormat', {
              file: file.name,
            }),
          );
        } else {
          files_to_upload.push({
            blob: file,
            name: file.name,
          });
        }
      }
      await this.uploadFiles(files_to_upload);
    },
    async handleFile(e: any) {
      if (this.readonly) {
        return;
      }
      let files: File[];
      if (e.target && e.target.files) {
        files = [...e.target.files];
        e.target.value = null;
      } else if (e.dataTransfer && e.dataTransfer.files)
        files = [...e.dataTransfer.files];
      else if (this.$refs.fileInput && (this.$refs.fileInput as any).files)
        files = [...(this.$refs.fileInput as any).files];
      else files = [];

      await this.processFiles(files);
    },
    selectFiles() {
      const upload_input = this.$refs.fileInput as HTMLInputElement | undefined;
      if (!upload_input) return;
      upload_input.onchange = (e) => {
        this.handleFile(e);
      };
      upload_input.click();
    },
    async getFileFromBuffer() {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const files: { blob: Blob; name: string }[] =
            await getClipboardImagesContent();
          if (files.length === 0) {
            throw Error(
              this.$t('assetEditor.galleryBlockPasteFromBufferEmpty'),
            );
          }
          await this.uploadFiles(files);
        });
    },
    async addVideoLink() {
      const video = await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          yesCaption: this.$t('common.dialogs.save'),
          header: this.$t('assetEditor.galleryBlockAddVideoLinkMessage'),
          placeholder: this.$t(
            'assetEditor.galleryBlockAddVideoLinkPlaceholder',
          ),
          fileType: 'video',
        });
      if (video) {
        const new_key = encodeAssetPropPartWithCapitals(video.value);
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          {
            [`${new_key}\\value`]: video.value,
            [`${new_key}\\type`]: video.type,
            [`${new_key}\\index`]: getNextIndexWithTimestamp(
              this.realEntries.maxIndex,
            ),
          },
        );
        this.save();
      }
    },
    async addImageLink() {
      const image = await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          yesCaption: this.$t('common.dialogs.save'),
          fileType: 'image',
          header: this.$t('assetEditor.galleryBlockAddExternalImageMessage'),
          placeholder: this.$t(
            'assetEditor.galleryBlockAddExternalImagePlaceholder',
          ),
        });
      if (image) {
        const new_key = normalizeAssetPropPart(image.value);
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          {
            [`${new_key}\\value`]: image.value,
            [`${new_key}\\type`]: image.type,
            [`${new_key}\\index`]: getNextIndexWithTimestamp(
              this.realEntries.maxIndex,
            ),
          },
        );
        this.save();
      }
    },
    save() {
      this.$emit('save');
    },
    deleteImage(item: GalleryBlockItemObject) {
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.assetChanger.deleteBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            `${item.key}`,
          );
          this.save();
        });
    },
    dropFile(ev: DragEvent) {
      if (!ev.dataTransfer) {
        return;
      }
      this.dragEffect = 0;
      this.handleFile(ev);
    },
    dragFileEnter(ev: DragEvent) {
      const is_file_move =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      this.dragEffect = is_file_move ? 1 : 0;
      if (is_file_move && ev.dataTransfer && ev.dataTransfer.items) {
        const are_images = [...ev.dataTransfer.items].some((i) => {
          return /^image\/.+$/i.test(i.type);
        });
        this.dragEffect = are_images ? 1 : -1;
      }
      if (ev.dataTransfer && this.dragEffect !== 1) {
        ev.dataTransfer.dropEffect = 'none';
      }
    },
    dragFileLeave(ev: DragEvent) {
      if (!nodeContainsElement(this.$el, ev.relatedTarget as Node)) {
        this.dragEffect = 0;
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.GalleryBlock {
  border: 1px solid var(--local-bg-color);

  &.state-drag-ok {
    border-color: var(--color-main-yellow);
  }

  &.state-drag-error {
    border-color: var(--color-main-error);
  }
}
.GalleryBlock-item {
  break-inside: avoid;
}

.GalleryBlock-items {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;

  &:not(:last-child) {
    margin-bottom: 10px;
  }
}

.GalleryBlock-items-addButton {
  align-self: flex-start;
}

.GalleryBlock-differentValues,
.GalleryBlock-uploadProgressPercent,
.GalleryBlock-uploadProgressPercent-content {
  width: 200px;
  max-width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 4px;
  box-sizing: border-box;
  padding: 20px;
}

.GalleryBlock-uploadProgressPercent {
  border: 1px solid var(--color-main-yellow);
  color: var(--color-main-yellow);
  position: relative;
}

.GalleryBlock-uploadProgressPercent-bar,
.GalleryBlock-uploadProgressPercent-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}

.GalleryBlock-uploadProgressPercent-bar {
  background: var(--color-main-yellow);
  opacity: 0.02;
  transform-origin: bottom;
}

.GalleryBlock-differentValues {
  border: 1px solid #363633;
  color: #999;
}

.GalleryBlock-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
