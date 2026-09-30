<template>
  <div
    class="GalleryBlock"
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
        @update:list="reorderItems($event)"
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
              @set-caption="onSetGalleryItemCaption(item)"
              @set-name="setName(item)"
              @fill="onFillItem"
              @clear="clearSlot(item)"
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
            <i class="ri-image-add-line"></i>
            <span>{{ $t('assetEditor.galleryBlockAddMedia') }}</span>
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
    <drag-overlay
      :visible="dragEffect !== 0"
      :error="dragEffect === -1"
      :text="
        dragEffect === -1
          ? $t('dragOverlay.imagesOnly')
          : $t('dragOverlay.drop')
      "
    ></drag-overlay>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import UiManager from '#logic/managers/UiManager';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import {
  extractGalleryBlockEntries,
  getGalleryItemKey,
  isGalleryItemEmpty,
  isGalleryItemSlot,
  type GalleryBlockExtractedEntries,
  type GalleryBlockItemObject,
} from './GalleryBlock';
import GalleryBlockItem from './GalleryBlockItem.vue';
import {
  castAssetPropValueToString,
  encodeAssetPropPartWithCapitals,
  makeBlockRef,
  normalizeAssetPropPart,
  type AssetProps,
} from '#logic/types/Props';
import MenuButton from '#components/Common/MenuButton.vue';
import DialogManager from '#logic/managers/DialogManager';
import { nodeContainsElement } from '#components/utils/DomElementUtils';
import SortableList from '#components/Common/SortableList.vue';
import DragOverlay from '#components/Common/DragOverlay.vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import ExternalLinkDialog from './ExternalLinkDialog.vue';
import MenuList from '#components/Common/MenuList.vue';
import type { MenuListItem } from '#logic/types/MenuList';
import { getClipboardImagesContent } from '#logic/utils/clipboard';
import type { AssetChanger } from '#logic/types/AssetChanger';
import ScreenshotRenderer from '#components/Common/ScreenshotRenderer.vue';
import PromptDialog from '#components/Common/PromptDialog.vue';
import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
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
    DragOverlay,
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
      fillTargetKey: null as string | null,
    };
  },
  computed: {
    viewReady() {
      return [...this.readyStates.values()].every((x) => x);
    },
    menuList(): MenuListItem[] {
      return [
        {
          title: this.$t('assetEditor.galleryBlockAddFileFromComputer'),
          action: () => this.addFileFromComputer(null),
          icon: 'file',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddVideoLink'),
          action: () => this.addVideoLink(null),
          icon: 'video',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddExternalImage'),
          action: () => this.addImageLink(null),
          icon: 'image',
        },
        {
          title: this.$t('assetEditor.galleryBlockPasteFromBuffer'),
          action: () => this.addFileFromBuffer(null),
          icon: 'ri-clipboard-line',
        },
        {
          type: 'separator',
        },
        {
          title: this.$t('assetEditor.galleryBlockCreateSlot'),
          action: () => this.createSlot(),
          icon: 'ri-folder-add-line',
        },
      ];
    },
    filesForGallery() {
      const filled_items = this.galleryItems.filter(
        (item) => !isGalleryItemEmpty(item),
      );
      if (!filled_items || !filled_items.length) {
        return undefined;
      }
      return filled_items;
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
    reorderItems(reordered_blocks: GalleryBlockItemObject[]) {
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
            [`~${reordered_blocks[i].key}\\index`]: null,
            [`__slots\\${reordered_blocks[i].key}\\index`]: i,
          },
          op,
        );
      }
      this.$emit('save');
    },
    showError(error: any) {
      this.$getAppManager().get(UiManager).showError(error);
    },
    async uploadFiles(
      files: { blob: Blob; name: string }[],
      target_key: string | null = null,
    ) {
      this.uploadTotal += files.length;
      for (const file of files) {
        try {
          await this.uploadBlob(file.blob, file.name, target_key);
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
    async uploadBlob(
      blob: Blob,
      file_name: string,
      target_key: string | null = null,
    ) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.uploadJob = this.$getAppManager()
            .get(EditorManager)
            .attachFile(blob, file_name);
          const res = await this.uploadJob.awaitResult();
          if (!res) return;

          const new_key = target_key ?? getGalleryItemKey('file', res);
          const props: AssetProps = {
            [`${new_key}\\value`]: res,
            [`${new_key}\\type`]: 'file',
          };
          if (target_key) {
            props[`~${new_key}`] = null;
          } else {
            props[`__slots\\${new_key}\\index`] = getNextIndexWithTimestamp(
              this.realEntries.maxIndex,
            );
          }
          this.assetChanger.setBlockPropKeys(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            props,
          );
          this.save();
        });
    },
    async processFiles(files: File[], target_key: string | null = null) {
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
      if (!files_to_upload.length) return;
      if (target_key) files_to_upload.splice(1);
      await this.uploadFiles(files_to_upload, target_key);
    },
    async handleFile(e: any) {
      if (this.readonly) {
        return;
      }
      const target_key = this.fillTargetKey;
      this.fillTargetKey = null;
      let files: File[];
      if (e.target && e.target.files) {
        files = [...e.target.files];
        e.target.value = null;
      } else if (e.dataTransfer && e.dataTransfer.files)
        files = [...e.dataTransfer.files];
      else if (this.$refs.fileInput && (this.$refs.fileInput as any).files)
        files = [...(this.$refs.fileInput as any).files];
      else files = [];

      await this.processFiles(files, target_key);
    },
    addFileFromComputer(target_key: string | null = null) {
      this.fillTargetKey = target_key;
      const upload_input = this.$refs.fileInput as HTMLInputElement | undefined;
      if (!upload_input) {
        this.fillTargetKey = null;
        return;
      }
      upload_input.onchange = (e) => {
        this.handleFile(e);
      };
      upload_input.click();
    },
    async addFileFromBuffer(target_key: string | null = null) {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const files: { blob: Blob; name: string }[] =
            await getClipboardImagesContent();
          if (files.length === 0) {
            throw Error(
              this.$t('assetEditor.galleryBlockPasteFromBufferEmpty'),
            );
          }
          if (target_key) files.splice(1);
          await this.uploadFiles(files, target_key);
        });
    },
    async addVideoLink(target_key: string | null = null) {
      const video = await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          linkKind: 'video',
        });
      if (video) {
        const new_key =
          target_key ?? getGalleryItemKey(video.itemType, video.value);
        const props: AssetProps = {
          [`${new_key}\\value`]: video.value,
          [`${new_key}\\type`]: video.itemType,
        };
        if (target_key) {
          props[`~${new_key}`] = null;
        } else {
          props[`__slots\\${new_key}\\index`] = getNextIndexWithTimestamp(
            this.realEntries.maxIndex,
          );
        }
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          props,
        );
        this.save();
      }
    },
    async addImageLink(target_key: string | null = null) {
      const image = await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          linkKind: 'image',
        });
      if (image) {
        const new_key =
          target_key ?? getGalleryItemKey(image.itemType, image.value);
        const props: AssetProps = {
          [`${new_key}\\value`]: image.value,
          [`${new_key}\\type`]: image.itemType,
        };

        if (target_key) {
          props[`~${new_key}`] = null;
        } else {
          props[`__slots\\${new_key}\\index`] = getNextIndexWithTimestamp(
            this.realEntries.maxIndex,
          );
        }
        this.assetChanger.setBlockPropKeys(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          props,
        );
        this.save();
      }
    },
    async onFillItem(payload: {
      action: string;
      key: string | null;
      ev?: DragEvent;
    }) {
      if (this.readonly) return;
      const { action, key, ev } = payload;
      if (action === 'file') {
        this.addFileFromComputer(key);
      } else if (action === 'video') {
        await this.addVideoLink(key);
      } else if (action === 'image') {
        await this.addImageLink(key);
      } else if (action === 'buffer') {
        await this.addFileFromBuffer(key);
      } else if (action === 'drop') {
        if (!ev) return;
        this.fillTargetKey = key;
        await this.handleFile(ev);
      }
    },
    validateSlotName(current_key: string | null, val: string) {
      const name = (val ?? '').trim();
      if (!name) {
        if (current_key === null) {
          throw new Error(this.$t('assetEditor.galleryBlockSlotNameEmpty'));
        }
        return name;
      }
      const new_key = normalizeAssetPropPart(name);
      if (
        new_key !== current_key &&
        this.realEntries.map.hasOwnProperty(new_key)
      ) {
        throw new Error(this.$t('assetEditor.galleryBlockSlotNameAlreadyUsed'));
      }
      return name;
    },
    async askSlotName(value: string | undefined, current_key: string | null) {
      return await this.$getAppManager()
        .get(DialogManager)
        .show(PromptDialog, {
          header: this.$t('assetEditor.galleryBlockSetSlotName'),
          message: this.$t('assetEditor.galleryBlockSetSlotNameMessage'),
          placeholder: this.$t('fields.serviceName'),
          yesCaption: this.$t('common.dialogs.save'),
          type: 'text',
          value,
          validate: (val: string) => this.validateSlotName(current_key, val),
        });
    },
    async confirmSlotRemoval() {
      const answer = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('assetEditor.galleryBlockRemoveSlot'),
          message: this.$t('assetEditor.galleryBlockRemoveSlotConfirm'),
          danger: true,
        });
      return answer === true;
    },
    async createSlot() {
      if (this.readonly) return;
      const name = await this.askSlotName(undefined, null);
      if (!name) return;

      const new_key = normalizeAssetPropPart(name);

      this.assetChanger.setBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        {
          [`${new_key}`]: null,
          [`__slots\\${new_key}\\name`]: name,
          [`__slots\\${new_key}\\index`]: getNextIndexWithTimestamp(
            this.realEntries.maxIndex,
          ),
        },
      );
      this.save();
    },
    async setName(item: GalleryBlockItemObject) {
      if (this.readonly) return;
      const name = await this.askSlotName(
        castAssetPropValueToString(item.name) || undefined,
        item.key,
      );
      if (name === undefined || name === null) return;
      const trimmed = name.trim();
      const op = this.assetChanger.makeOpId();
      const block_ref = makeBlockRef(this.resolvedBlock);

      if (!trimmed) {
        if (!(await this.confirmSlotRemoval())) return;
        if (isGalleryItemEmpty(item)) {
          this.deleteImage(item);
          return;
        }
        const new_key = getGalleryItemKey(item.type!, item.value);
        this.assetChanger.deleteBlockPropKey(
          this.resolvedBlock.assetId,
          block_ref,
          null,
          `__slots\\${item.key}\\name`,
          op,
        );
        this.assetChanger.renameBlockPropKeys(
          this.resolvedBlock.assetId,
          block_ref,
          null,
          {
            [`__slots\\${item.key}`]: `__slots\\${new_key}`,
            [`${item.key}`]: `${new_key}`,
          },
          op,
        );
        this.save();
        return;
      }

      const new_key = normalizeAssetPropPart(trimmed);
      if (new_key !== item.key) {
        this.assetChanger.renameBlockPropKeys(
          this.resolvedBlock.assetId,
          block_ref,
          null,
          {
            [item.key]: new_key,
            [`__slots\\${item.key}`]: `__slots\\${new_key}`,
          },
          op,
        );
      }
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        block_ref,
        null,
        `__slots\\${new_key}\\name`,
        trimmed,
        op,
      );
      this.save();
    },
    save() {
      this.$emit('save');
    },
    async onSetGalleryItemCaption(item: GalleryBlockItemObject) {
      const caption = await this.$getAppManager()
        .get(DialogManager)
        .show(PromptDialog, {
          header: this.$t('assetEditor.galleryBlockSetCaption'),
          value: item.title ? castAssetPropValueToString(item.title) : '',
          placeholder: this.$t('assetEditor.galleryBlockCaptionPlaceholder'),
          yesCaption: this.$t('common.dialogs.save'),
          type: 'text',
        });
      if (caption === undefined || caption === null) return;
      this.assetChanger.setBlockPropKeys(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        {
          [`${item.key}\\title`]: caption.trim() ? caption.trim() : null,
        },
      );
      this.save();
    },
    clearSlot(item: GalleryBlockItemObject) {
      if (this.readonly) return;
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          this.assetChanger.setBlockPropKeys(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            {
              [`~${item.key}`]: null,
              [`${item.key}`]: null,
            },
          );
          this.save();
        });
    },
    deleteImage(item: GalleryBlockItemObject) {
      if (this.readonly) return;
      this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const op = this.assetChanger.makeOpId();
          this.assetChanger.deleteBlockPropKeys(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            [item.key, `__slots\\${item.key}`],
            op,
          );
          this.save();
        });
    },
    dropFile(ev: DragEvent) {
      if (!ev.dataTransfer) {
        return;
      }
      this.dragEffect = 0;
      this.fillTargetKey = null;
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
  position: relative;
}
.GalleryBlock-item {
  break-inside: avoid;
  display: flex;
  flex-direction: column;
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
