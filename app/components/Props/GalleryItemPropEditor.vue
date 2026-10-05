<template>
  <div class="GalleryItemPropEditor">
    <block-with-menu
      v-if="isFilled"
      class="GalleryItemPropEditor-pill"
      menu-position="float"
      :menu-list="itemMenu"
    >
      <span
        class="GalleryItemPropEditor-pillContent"
        :class="{ 'state-isStatic': !showMenu }"
        :title="itemTooltip"
        @click="onPillClick"
      >
        <img
          v-if="itemThumbSrc"
          class="GalleryItemPropEditor-pillThumb"
          :src="itemThumbSrc"
          :alt="itemTitleParts.base"
          @error="onThumbError"
        />
        <i v-else class="GalleryItemPropEditor-pillIcon" :class="typeIcon"></i>
        <span class="GalleryItemPropEditor-pillTitle">{{
          itemTitleParts.base
        }}</span>
        <span class="GalleryItemPropEditor-pillExt">{{
          itemTitleParts.ext
        }}</span>
      </span>
    </block-with-menu>
    <menu-button
      v-else-if="editMode"
      class="GalleryItemPropEditor-add"
      :tooltip="$t('assetEditor.galleryBlockAddMedia')"
    >
      <template #button="{ tooltip, show }">
        <button
          class="is-button is-button-normal GalleryItemPropEditor-addButton"
          :title="tooltip"
          @click="show"
        >
          <i class="ri-image-add-line"></i>
          <span>{{ $t('assetEditor.galleryBlockAddMedia') }}</span>
        </button>
      </template>
      <menu-list :menu-list="addMenuList"></menu-list>
    </menu-button>
    <input
      v-if="editMode"
      ref="fileInput"
      type="file"
      class="GalleryItemPropEditor-fileInput"
      :accept="fileAccept"
      @change="onFileInputChange"
    />
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import DialogManager from '#logic/managers/DialogManager';
import EditorManager from '#logic/managers/EditorManager';
import UiManager from '#logic/managers/UiManager';
import type {
  AssetProps,
  AssetPropValue,
  AssetPropValueFile,
} from '#logic/types/Props';
import { castAssetPropValueToString } from '#logic/types/Props';
import { ThumbParamsFit, type ThumbParams } from '#logic/utils/files';
import { getClipboardImagesContent } from '#logic/utils/clipboard';
import type { MenuListItem } from '#logic/types/MenuList';
import type { PropsFormFieldDef, PropsFormState } from '#logic/types/PropsForm';
import type { AssetDisplayMode } from '#logic/utils/assets';
import type { GalleryBlockItemType } from '~ims-plugin-base/blocks/GalleryBlock/GalleryBlock';
import ExternalLinkDialog from '~ims-plugin-base/blocks/GalleryBlock/ExternalLinkDialog.vue';
import GalleryBlockVideoDialog from '~ims-plugin-base/blocks/GalleryBlock/GalleryBlockVideoDialog.vue';
import FilePresenterDialog from '#components/File/FilePresenterDialog.vue';
import { useFilePresenterParams } from '#components/File/FilePresenter';
import BlockWithMenu from '#components/Common/BlockWithMenu.vue';
import MenuButton from '#components/Common/MenuButton.vue';
import MenuList from '#components/Common/MenuList.vue';
import PromptDialog from '#components/Common/PromptDialog.vue';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'svg', 'gif']);

const VIDEO_TYPES: GalleryBlockItemType[] = [
  'youtube',
  'extvideo',
  'rutube',
  'vkvideo',
];

const TYPE_ICONS: Record<string, string> = {
  youtube: 'ri-youtube-fill',
  rutube: 'ri-play-circle-fill',
  vkvideo: 'ri-play-circle-fill',
  extvideo: 'ri-film-fill',
  extimage: 'ri-image-2-line',
  file: 'ri-file-image-line',
};

const THUMB_SIZE = 24;

const THUMB_PARAMS: ThumbParams = {
  width: THUMB_SIZE * 2,
  height: THUMB_SIZE * 2,
  fit: ThumbParamsFit.COVER,
};

export default defineComponent({
  name: 'GalleryItemPropEditor',
  components: {
    BlockWithMenu,
    MenuButton,
    MenuList,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean, null] as PropType<AssetPropValue>,
      default: null,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    editMode: { type: Boolean, default: false },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['update:modelValue', 'blur', 'enter', 'changeProps'],
  data() {
    return {
      thumbFailedUrl: null as string | null,
    };
  },
  computed: {
    showMenu(): boolean {
      return this.displayMode === 'normal';
    },
    valueKey(): string {
      return `${this.field.propKey}\\value`;
    },
    typeKey(): string {
      return `${this.field.propKey}\\type`;
    },
    titleKey(): string {
      return `${this.field.propKey}\\title`;
    },
    itemValue(): AssetPropValue | null {
      return this.formState.combined[this.valueKey] ?? null;
    },
    itemType(): GalleryBlockItemType | null {
      const type = this.formState.combined[this.typeKey];
      if (!type) return null;
      return castAssetPropValueToString(type) as GalleryBlockItemType;
    },
    itemTitle(): string {
      return castAssetPropValueToString(
        this.formState.combined[this.titleKey] ?? null,
      );
    },
    itemValueAsString(): string {
      return castAssetPropValueToString(this.itemValue);
    },
    itemTitleOrValue(): string {
      return this.itemTitle || this.itemValueAsString;
    },
    itemTitleParts(): { base: string; ext: string } {
      const file = this.itemFile;
      if (this.isFile && file) {
        const title = file.Title ?? '';
        const last_dot = title.lastIndexOf('.');
        if (last_dot < 0) return { base: title, ext: '' };
        return {
          base: title.substring(0, last_dot),
          ext: title.substring(last_dot),
        };
      }
      return { base: this.itemTitleOrValue, ext: '' };
    },
    itemTooltip(): string {
      if (this.isFile) {
        return this.itemFile?.Title || this.itemValueAsString;
      }
      return this.itemWatchLink || this.itemValueAsString;
    },
    isFilled(): boolean {
      return this.itemType !== null || !!this.itemValue;
    },
    isFile(): boolean {
      return this.itemType === 'file';
    },
    isVideoType(): boolean {
      return this.itemType !== null && VIDEO_TYPES.includes(this.itemType);
    },
    itemFile(): AssetPropValueFile | null {
      const value = this.itemValue as AssetPropValueFile | null;
      if (this.isFile && value && value.FileId) return value;
      return null;
    },
    itemWatchLink(): string {
      const code = this.itemValueAsString;
      switch (this.itemType) {
        case 'youtube':
          return `https://www.youtube.com/watch?v=${code}`;
        case 'rutube':
          return `https://rutube.ru/video/${code}`;
        case 'vkvideo': {
          const [oid, id] = code.split('_');
          return `https://vk.com/video${oid}_${id}`;
        }
        case 'extvideo':
        case 'extimage':
          return code;
        default:
          return '';
      }
    },
    typeIcon(): string {
      if (this.isFile) {
        const file = this.itemFile;
        if (!file) return 'ri-file-3-fill';
        return useFilePresenterParams(file).icon;
      }
      return this.itemType ? (TYPE_ICONS[this.itemType] ?? 'ri-file-line') : '';
    },
    itemThumbUrl(): string | null {
      if (this.isFile) {
        const file = this.itemFile;
        if (!file) return null;
        const params = useFilePresenterParams(file, THUMB_PARAMS);
        return params.inlineType === 'img' ? params.link : null;
      }
      if (this.itemType === 'extimage') return this.itemValueAsString || null;
      return null;
    },
    itemThumbSrc(): string | null {
      const url = this.itemThumbUrl;
      if (!url || url === this.thumbFailedUrl) return null;
      return url;
    },
    fileAccept(): string {
      return [...ALLOWED_EXTENSIONS].map((ext) => `.${ext}`).join(',');
    },
    addMenuList(): MenuListItem[] {
      return [
        {
          title: this.$t('assetEditor.galleryBlockAddFileFromComputer'),
          icon: 'file',
          action: () => this.addFileFromComputer(),
        },
        {
          title: this.$t('assetEditor.galleryBlockAddVideoLink'),
          icon: 'video',
          action: () => this.addVideoLink(),
        },
        {
          title: this.$t('assetEditor.galleryBlockAddExternalImage'),
          icon: 'image',
          action: () => this.addImageLink(),
        },
        {
          title: this.$t('assetEditor.galleryBlockPasteFromBuffer'),
          icon: 'ri-clipboard-line',
          action: () => this.addFileFromBuffer(),
        },
      ];
    },
    itemMenu(): MenuListItem[] {
      if (!this.showMenu) return [];
      return [
        {
          title: this.$t('assetEditor.galleryBlockSetCaption'),
          icon: 'ri-text',
          action: () => this.setCaption(),
        },
        {
          title: this.$t('assetEditor.blockMenu.delete'),
          icon: 'delete',
          danger: true,
          action: () => this.deleteValue(),
        },
      ];
    },
  },
  methods: {
    onThumbError() {
      this.thumbFailedUrl = this.itemThumbUrl;
    },
    onPillClick(ev: MouseEvent) {
      if (!this.showMenu) return;
      const inside_menu = (ev.target as HTMLElement).closest(
        '.BlockWithMenu-menu.ref-menu',
      );
      if (inside_menu) return;
      if (ev.ctrlKey || ev.metaKey) {
        this.openExternal();
        return;
      }
      this.openPreview();
    },
    openExternal() {
      if (this.isFile) {
        const file = this.itemFile;
        if (!file) return;
        this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.$getAppManager()
              .get(EditorManager)
              .downloadAttachment(file);
          });
        return;
      }
      const link = this.itemWatchLink;
      if (link) window.open(link, '_blank');
    },
    openPreview() {
      if (this.isFile) {
        const file = this.itemFile;
        if (!file) return;
        this.$getAppManager()
          .get(DialogManager)
          .show(FilePresenterDialog, { value: file });
        return;
      }
      if (this.isVideoType) {
        this.$getAppManager()
          .get(DialogManager)
          .show(GalleryBlockVideoDialog, {
            code: this.itemValueAsString,
            type: this.itemType as
              | 'extvideo'
              | 'youtube'
              | 'vkvideo'
              | 'rutube',
          });
        return;
      }
      if (this.itemType === 'extimage') {
        this.$getAppManager().get(DialogManager).show(FilePresenterDialog, {
          value: this.itemValue,
          type: 'extimage',
        });
      }
    },
    async addFileFromComputer() {
      const input = this.$refs.fileInput as HTMLInputElement | undefined;
      if (!input) return;
      input.click();
    },
    async addFileFromBuffer() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const files = await getClipboardImagesContent();
          if (files.length === 0) {
            throw Error(
              this.$t('assetEditor.galleryBlockPasteFromBufferEmpty'),
            );
          }
          await this.uploadFiles(
            files.slice(0, 1).map((file) => ({
              blob: file.blob,
              name: file.name,
            })),
          );
        });
    },
    async uploadFiles(files: { blob: Blob; name: string }[]) {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        if (!ext || !ALLOWED_EXTENSIONS.has(ext.toLowerCase())) {
          this.$getAppManager()
            .get(UiManager)
            .showError(
              this.$t('file.errorUnsupportedFormat', { file: file.name }),
            );
          continue;
        }
        await this.uploadBlob(file.blob, file.name);
      }
    },
    async uploadFile(file: File) {
      const ext = file.name.split('.').pop();
      if (!ext || !ALLOWED_EXTENSIONS.has(ext.toLowerCase())) {
        this.$getAppManager()
          .get(UiManager)
          .showError(
            this.$t('file.errorUnsupportedFormat', { file: file.name }),
          );
        return;
      }
      await this.uploadBlob(file, file.name);
    },
    async uploadBlob(blob: Blob, fileName: string) {
      const job = this.$getAppManager()
        .get(EditorManager)
        .attachFile(blob, fileName);
      const res = await job.awaitResult();
      if (!res) return;
      this.setValue('file', res as AssetPropValueFile);
    },
    async addVideoLink() {
      const video = (await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          linkKind: 'video',
        })) as { itemType: GalleryBlockItemType; value: string } | null;
      if (!video) return;
      this.setValue(video.itemType, video.value);
    },
    async addImageLink() {
      const image = (await this.$getAppManager()
        .get(DialogManager)
        .show(ExternalLinkDialog, {
          linkKind: 'image',
        })) as { itemType: GalleryBlockItemType; value: string } | null;
      if (!image) return;
      this.setValue(image.itemType, image.value);
    },
    async setCaption() {
      const caption = await this.$getAppManager()
        .get(DialogManager)
        .show(PromptDialog, {
          header: this.$t('assetEditor.galleryBlockSetCaption'),
          value: this.itemTitle,
          placeholder: this.$t('assetEditor.galleryBlockCaptionPlaceholder'),
          yesCaption: this.$t('common.dialogs.save'),
          type: 'text',
        });
      if (caption === undefined || caption === null) return;
      const trimmed = caption.trim();
      this.$emit('changeProps', [
        {
          [this.titleKey]: trimmed ? trimmed : null,
        },
      ]);
    },
    deleteValue() {
      const props: AssetProps = {
        [`~${this.field.propKey}`]: null,
        [`${this.field.propKey}`]: null,
      };
      this.$emit('changeProps', [props]);
    },
    setValue(type: GalleryBlockItemType, value: AssetPropValue) {
      const props: AssetProps = {
        [`~${this.field.propKey}`]: null,
        [this.valueKey]: value,
        [this.typeKey]: type,
      };
      this.$emit('changeProps', [props]);
    },
    async onFileInputChange(ev: Event) {
      const input = ev.target as HTMLInputElement;
      const files = input.files ? [...input.files].slice(0, 1) : [];
      input.value = '';
      for (const file of files) {
        await this.uploadFile(file);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.GalleryItemPropEditor {
  padding: 5px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.GalleryItemPropEditor-fileInput {
  display: none;
}

.GalleryItemPropEditor-addButton {
  white-space: nowrap;

  i {
    margin-right: 5px;
  }
}

.GalleryItemPropEditor-pill {
  min-width: 0;
  max-width: 100%;

  &:deep(.BlockWithMenu-menu.ref-menu) {
    top: 50%;
    transform: translateY(-50%);
    right: 10px;
  }
}

.GalleryItemPropEditor-pillContent {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--local-border-color);
  padding: 5px 10px;
  border-radius: 10px;
  min-width: 0;
  max-width: 100%;

  &:not(.state-isStatic) {
    cursor: pointer;
    // Место под «три точки», которые висят поверх бляшки. Резерв постоянный,
    // а не на hover: иначе бляшка прыгала бы в ширину при наведении и дёргала
    // соседние ячейки грида. `state-isStatic` — это ровно «меню нет»
    // (`itemMenu` пуст, `.BlockWithMenu-menu` не рендерится), так что в
    // статичном режиме гаттер не резервируется и бляшка остаётся компактной.
    padding-right: 30px;

    &:hover {
      border-color: var(--color-accent);
    }
  }
}

.GalleryItemPropEditor-pillIcon {
  flex: none;
  margin-right: 5px;
}

.GalleryItemPropEditor-pillThumb {
  flex: none;
  width: 24px;
  height: 24px;
  margin-right: 5px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--local-bg-color);
}

.GalleryItemPropEditor-pillTitle {
  flex: 1;
  min-width: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.GalleryItemPropEditor-pillExt {
  white-space: nowrap;
}
</style>
