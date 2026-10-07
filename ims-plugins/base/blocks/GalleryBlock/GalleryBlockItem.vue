<template>
  <div class="GalleryBlockItem">
    <div
      v-if="isEmpty"
      class="GalleryBlockItem-slot"
      :class="{
        'state-drag-over': isDropTarget && slotDragEffect === 1,
        'state-drag-over-error': isDropTarget && slotDragEffect === -1,
      }"
      @dragover.prevent.stop="onSlotDragOver"
      @dragleave.prevent.stop="onSlotDragLeave"
      @drop.prevent.stop="onDrop"
    >
      <menu-button
        v-if="!readonly && !isUploadingToThisSlot"
        class="GalleryBlockItem-slot-add"
        :tooltip="$t('assetEditor.galleryBlockFillSlot')"
        @show="shownDropdownMenuIdx = item.index"
        @hide="shownDropdownMenuIdx = null"
      >
        <template #button="{ tooltip, show }">
          <button
            class="is-button is-button-icon GalleryBlockItem-slot-add-button"
            :title="tooltip"
            @click="show"
          >
            <i class="ri-image-add-line"></i>
          </button>
        </template>
        <menu-list :menu-list="addMenuList"></menu-list>
      </menu-button>
      <div v-if="isUploadingToThisSlot" class="GalleryBlockItem-uploadProgress">
        <div
          class="GalleryBlockItem-uploadProgress-bar"
          :style="{
            transform: `scaleY(${uploadProgressPercent}%)`,
          }"
        ></div>
        <div class="GalleryBlockItem-uploadProgress-content">
          {{ $t('file.uploading') }}
          <br />
          {{ uploadProgressPercent }}%
        </div>
      </div>
      <div
        v-if="!isUploadingToThisSlot"
        class="GalleryBlockItem-slot-name"
        :title="item.name || $t('assetEditor.galleryBlockEmptySlot')"
      >
        <i class="ri-price-tag-3-line GalleryBlockItem-slot-name-icon"></i>
        <span class="GalleryBlockItem-slot-name-text">{{ item.name }}</span>
      </div>
      <drag-overlay
        :visible="isDropTarget"
        :error="slotDragEffect === -1"
        :text="
          slotDragEffect === -1
            ? $t('dragOverlay.imagesOnly')
            : $t('assetEditor.galleryBlockDropToSlot')
        "
      ></drag-overlay>
    </div>
    <file-presenter
      v-else-if="item.type === 'file'"
      :inline="true"
      class="GalleryBlockItem-content"
      :class="{
        'state-pixilated': imagePixilatedMode,
      }"
      :value="item.value"
      :tooltip="fileTooltip"
      @click="fileClick"
    ></file-presenter>
    <gallery-block-video
      v-else-if="
        item.type === 'youtube' ||
        item.type === 'extvideo' ||
        item.type === 'rutube' ||
        item.type === 'vkvideo'
      "
      class="GalleryBlockItem-content"
      :code="item.value ? item.value.toString() : ''"
      :type="item.type"
    ></gallery-block-video>
    <img
      v-else-if="item.type === 'extimage'"
      :src="itemValueAsString"
      alt=""
      class="GalleryBlockItem-content"
      @click="extimageClick()"
    />
    <div
      v-if="!isEmpty && item.title && allowCaption"
      class="GalleryBlockItem-caption"
    >
      {{ itemTitleAsString }}
    </div>
    <div
      v-if="!isEmpty && item.name"
      class="GalleryBlockItem-slotName"
      :title="item.name"
    >
      <i class="ri-price-tag-3-line GalleryBlockItem-slotName-icon"></i>
      <span class="GalleryBlockItem-slotName-text">{{ item.name }}</span>
    </div>
    <menu-button
      v-if="!readonly"
      class="GalleryBlockItem-menu"
      :class="{ 'state-active': item.index === shownDropdownMenuIdx }"
      @show="shownDropdownMenuIdx = item.index"
      @hide="shownDropdownMenuIdx = null"
    >
      <menu-list :menu-list="getMenuList()"></menu-list>
    </menu-button>
  </div>
</template>

<script lang="ts">
import type { UploadingJob } from '#logic/managers/EditorManager';
import { type PropType, defineComponent } from 'vue';
import DialogManager from '#logic/managers/DialogManager';
import ProjectManager from '#logic/managers/ProjectManager';
import UiManager from '#logic/managers/UiManager';
import {
  type AssetPropValueFile,
  castAssetPropValueToString,
} from '#logic/types/Props';
import MenuButton from '#components/Common/MenuButton.vue';
import ConfirmDialog from '#components/Common/ConfirmDialog.vue';
import FilePresenter from '#components/File/FilePresenter.vue';
import FilePresenterDialog from '#components/File/FilePresenterDialog.vue';
import {
  isGalleryItemEmpty,
  isGalleryItemSlot,
  type GalleryBlockItemObject,
} from './GalleryBlock';
import GalleryBlockVideo from './GalleryBlockVideo.vue';
import MenuList from '#components/Common/MenuList.vue';
import DragOverlay from '#components/Common/DragOverlay.vue';
import { nodeContainsElement } from '#components/utils/DomElementUtils';
import type { MenuListItem } from '#logic/types/MenuList';
import EditorManager from '#logic/managers/EditorManager';
import { useFilePresenterParams } from '#components/File/FilePresenter';

const PIXILATED_MODE_SIZE_THRESHOLD = 96;

export default defineComponent({
  name: 'GalleryBlockItem',
  components: {
    FilePresenter,
    MenuButton,
    GalleryBlockVideo,
    MenuList,
    DragOverlay,
  },
  props: {
    readonly: {
      type: Boolean,
      default: false,
    },
    item: { type: Object as PropType<GalleryBlockItemObject>, default: null },
    files: {
      type: Array as PropType<GalleryBlockItemObject[]>,
      default: null,
    },
    allowCaption: {
      type: Boolean,
      default: true,
    },
    allowServiceName: {
      type: Boolean,
      default: true,
    },
    allowDrop: {
      type: Boolean,
      default: true,
    },
    currentUploadTargetKey: {
      type: String,
      default: null,
    },
    uploadProgressPercent: {
      type: Number,
      default: null,
    },
    uploadJob: {
      type: Object as PropType<UploadingJob | null>,
      default: null,
    },
  },
  emits: [
    'save',
    'delete',
    'set-caption',
    'set-name',
    'fill',
    'clear',
    'slot-drag-enter',
    'slot-drag-leave',
  ],
  data() {
    return {
      loadDone: false,
      shownDropdownMenuIdx: null as number | null,
      imagePixilatedMode: false,
      dragOverSlot: false,
      slotDragEffect: 0,
    };
  },
  computed: {
    projectId() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo()?.id;
    },
    isEmpty() {
      return isGalleryItemEmpty(this.item);
    },
    isSlot() {
      return isGalleryItemSlot(this.item);
    },
    isUploadingToThisSlot() {
      if (!this.item) return false;
      if (!this.isEmpty) return false;
      if (this.currentUploadTargetKey !== this.item.key) return false;
      if (this.uploadProgressPercent === null) return false;
      return true;
    },
    isDropTarget() {
      return (
        !this.readonly &&
        this.allowDrop &&
        this.dragOverSlot &&
        this.slotDragEffect !== 0
      );
    },
    addMenuList(): MenuListItem[] {
      const key = this.item?.key ?? null;
      return [
        {
          title: this.$t('assetEditor.galleryBlockAddFileFromComputer'),
          action: () => this.emitFill('file', key),
          icon: 'file',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddVideoLink'),
          action: () => this.emitFill('video', key),
          icon: 'video',
        },
        {
          title: this.$t('assetEditor.galleryBlockAddExternalImage'),
          action: () => this.emitFill('image', key),
          icon: 'image',
        },
        {
          title: this.$t('assetEditor.galleryBlockPasteFromBuffer'),
          action: () => this.emitFill('buffer', key),
          icon: 'ri-clipboard-line',
        },
      ];
    },
    fileTooltip() {
      const file = this.item.value as AssetPropValueFile;
      if (!file) return;

      return [
        file.Title,
        '',
        this.$t('file.clickToOpen'),
        this.$t('file.ctrlToDownload'),
      ].join('\n');
    },
    itemValueAsString() {
      return castAssetPropValueToString(this.item.value);
    },
    itemTitleAsString() {
      return castAssetPropValueToString(this.item.title);
    },
    fileImageSrc() {
      if (!this.item) return null;
      if (!this.item.value) return null;
      if (this.item.type !== 'file') return null;
      return useFilePresenterParams(this.item.value as AssetPropValueFile).link;
    },
  },
  watch: {
    fileImageSrc() {
      this._checkPixilatedMode();
    },
  },
  mounted() {
    this._checkPixilatedMode();
  },
  methods: {
    _checkPixilatedMode() {
      const src = this.fileImageSrc;
      if (!src) {
        this.imagePixilatedMode = false;
      } else {
        const img = new Image();
        img.onload = () => {
          if (src === this.fileImageSrc) {
            this.imagePixilatedMode =
              img.width <= PIXILATED_MODE_SIZE_THRESHOLD &&
              img.height <= PIXILATED_MODE_SIZE_THRESHOLD;
          }
        };
        img.src = src;
      }
    },
    emitFill(action: string, key: string | null, ev?: DragEvent) {
      this.$emit('fill', { action, key, ev });
    },
    onSlotDragOver(ev: DragEvent) {
      if (this.readonly || !this.allowDrop) {
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'none';
        return;
      }
      const is_file_move =
        ev.dataTransfer && ev.dataTransfer.types.includes('Files');
      let effect = is_file_move ? 1 : 0;
      if (is_file_move && ev.dataTransfer && ev.dataTransfer.items) {
        const are_images = [...ev.dataTransfer.items].some((i) => {
          return /^image\/.+$/i.test(i.type);
        });
        effect = are_images ? 1 : -1;
      }
      if (!this.dragOverSlot) {
        this.dragOverSlot = true;
        this.$emit('slot-drag-enter');
      }
      this.slotDragEffect = effect;
      if (ev.dataTransfer && effect !== 1) {
        ev.dataTransfer.dropEffect = 'none';
      }
    },
    onSlotDragLeave(ev: DragEvent) {
      if (nodeContainsElement(this.$el, ev.relatedTarget as Node)) return;
      this.resetSlotDragState();
    },
    resetSlotDragState() {
      if (!this.dragOverSlot) return;
      this.dragOverSlot = false;
      this.slotDragEffect = 0;
      this.$emit('slot-drag-leave');
    },
    onDrop(ev: DragEvent) {
      this.resetSlotDragState();
      this.emitFill('drop', this.item?.key ?? null, ev);
    },
    getMenuList(): MenuListItem[] {
      const items: MenuListItem[] = [];
      if (this.allowCaption && !this.isEmpty) {
        items.push({
          title: this.$t('assetEditor.galleryBlockSetCaption'),
          action: () => this.$emit('set-caption'),
          icon: 'ri-text',
        });
      }
      if (this.allowServiceName) {
        items.push({
          title: this.$t('assetEditor.blockMenu.setServiceName'),
          action: () => this.$emit('set-name'),
          icon: 'serviceName',
        });
      }
      if (this.isSlot && !this.isEmpty) {
        items.push({
          title: this.$t('assetEditor.galleryBlockClearSlot'),
          action: () => this.$emit('clear'),
          icon: 'ri-eraser-line',
        });
      }
      items.push({
        title: this.isSlot
          ? this.$t('assetEditor.galleryBlockDeleteSlot')
          : this.$t('assetEditor.blockMenu.delete'),
        action: () => this.deleteItem(),
        icon: 'delete',
        danger: true,
      });
      return items;
    },
    async deleteItem() {
      if (this.isSlot) {
        const answer = await this.$getAppManager()
          .get(DialogManager)
          .show(ConfirmDialog, {
            header: this.$t('assetEditor.galleryBlockRemoveSlot'),
            message: this.$t('assetEditor.galleryBlockRemoveSlotConfirm'),
            danger: true,
          });
        if (answer !== true) return;
      }
      this.$emit('delete');
    },
    extimageClick() {
      this.$getAppManager()
        .get(DialogManager)
        .show(FilePresenterDialog, {
          value: this.itemValueAsString,
          files: (this.files ?? []).map((el) => el.value),
          type: this.item.type,
        });
    },
    async fileClick(ev: MouseEvent) {
      const file = this.item.value as AssetPropValueFile;
      if (!file) return;

      if (ev.ctrlKey || ev.metaKey) {
        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            if (!this.item.value) return;
            await this.$getAppManager()
              .get(EditorManager)
              .downloadAttachment(file);
          });
      } else {
        this.$getAppManager()
          .get(DialogManager)
          .show(FilePresenterDialog, {
            value: file,
            files: (this.files ?? []).map((el) => el.value),
          });
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.GalleryBlockItem {
  position: relative;
}

.GalleryBlockItem-content {
  height: 200px;
  object-fit: contain;
  display: block;
  max-width: 100%;
  &.state-pixilated {
    image-rendering: pixelated;
  }
}

.GalleryBlockItem-slot {
  position: relative;
  width: 200px;
  max-width: 100%;
  height: 200px;
  box-sizing: border-box;
  border: 1px dashed var(--local-border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px;
  background: transparent;
  color: var(--local-sub-text-color);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }

  &.state-drag-over {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  }

  &.state-drag-over-error {
    border-color: var(--color-main-error);
    background: color-mix(in srgb, var(--color-main-error) 8%, transparent);
  }

  &.state-drag-over .GalleryBlockItem-slot-add,
  &.state-drag-over-error .GalleryBlockItem-slot-add {
    opacity: 0;
  }
}

.GalleryBlockItem-slot-add {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.GalleryBlockItem-slot-add-button {
  --button-width: 44px;
  --button-height: 44px;
  --button-padding: 0 !important;
  --button-icon-gap: 0;
  --button-border-width: 0;
  --button-border-color: transparent !important;
  --button-border-radius: 50%;
  --button-bg-color: transparent !important;
  --button-text-color: var(--color-accent) !important;
  --button-outline-color: transparent !important;
  font-size: 28px;
  line-height: 1;
  align-items: center;
  justify-content: center;
}

.GalleryBlockItem-slot-name {
  position: absolute;
  top: calc(50% + 42px);
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 20px);
  display: flex;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
  padding: 2px 10px;
  font-size: 13px;
  line-height: 1.35;
  color: var(--local-text-color);
  background-color: color-mix(in srgb, var(--local-bg-color) 85%, transparent);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.GalleryBlockItem-slot-name-icon {
  flex: none;
  font-size: 13px;
  line-height: 1;
  opacity: 0.7;
}

.GalleryBlockItem-slot-name-text {
  font-size: 13px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.GalleryBlockItem-caption {
  margin-top: 4px;
  text-align: center;
  font-size: 13px;
  color: var(--local-sub-text-color);
  overflow-wrap: break-word;
}

.GalleryBlockItem-slotName {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 1;
  max-width: calc(100% - 44px);
  display: flex;
  align-items: center;
  gap: 5px;
  box-sizing: border-box;
  padding: 2px 9px 2px 3px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--local-text-color);
  background-color: color-mix(in srgb, var(--local-bg-color) 85%, transparent);
  backdrop-filter: blur(4px);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.GalleryBlockItem-slotName-icon {
  flex: none;
  font-size: 12px;
  line-height: 1;
  opacity: 0.7;
}

.GalleryBlockItem-slotName-text {
  font-size: 12px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.GalleryBlockItem-menu {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1;
  display: none;
  border-radius: 4px;
  background-color: color-mix(in srgb, var(--local-bg-color) 85%, transparent);
  backdrop-filter: blur(4px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);

  &.state-active {
    display: block;
  }
}

.GalleryBlockItem-uploadProgress {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  border: 1px solid var(--color-main-yellow);
  color: var(--color-main-yellow);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 4px;
  box-sizing: border-box;
  padding: 20px;
  z-index: 2;
}

.GalleryBlockItem-uploadProgress-bar,
.GalleryBlockItem-uploadProgress-content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}

.GalleryBlockItem-uploadProgress-bar {
  background: var(--color-main-yellow);
  opacity: 0.02;
  transform-origin: bottom;
}

.GalleryBlockItem-uploadProgress-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-direction: column;
  padding: 20px;
}

.GalleryBlockItem:hover {
  .GalleryBlockItem-menu {
    display: block;
  }

  .GalleryBlockItem-slotName {
    opacity: 0.35;
  }
}
</style>
