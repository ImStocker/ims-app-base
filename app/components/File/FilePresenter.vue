<template>
  <span v-if="!isFilled" class="FilePresenter state-empty"></span>
  <span v-else-if="!fileValue" class="FilePresenter state-error">
    {{ $t('file.notFile') }}: {{ stringValue }}
  </span>
  <div v-else-if="localFilePath && !isDesktop && fileInfo?.inlineType">
    {{ $t('file.localProjectFile') }}
  </div>
  <block-with-menu
    v-else-if="displayAsLink"
    class="FilePresenter type-link is-interactive"
    :class="{
      'state-isStatic': isStatic,
    }"
    :title="fileTooltip"
    :menu-list="fileMenu"
    menu-position="float"
    @click="linkClick"
  >
    <span class="FilePresenter-linkContent">
      <i class="FilePresenter-icon" :class="fileInfo?.icon"></i>
      <span class="FilePresenter-basename">{{ fileTitleParts.base }}</span>
      <span class="FilePresenter-extname">{{ fileTitleParts.ext }}</span>
    </span>
  </block-with-menu>
  <img
    v-else-if="fileInfo?.inlineType === 'img'"
    class="FilePresenter type-inline is-interactive"
    :src="fileInfo?.link ?? undefined"
    :title="tooltip"
    :width="width"
    :height="height"
    @click="$emit('click', $event)"
    @error="$emit('error')"
  />
  <video
    v-else-if="fileInfo?.inlineType === 'video'"
    class="FilePresenter type-inline is-interactive"
    :title="tooltip"
    :width="width"
    :height="height"
    controls
    :src="fileInfo?.link ?? undefined"
  ></video>
  <figure
    v-else-if="fileInfo?.inlineType === 'audio'"
    class="FilePresenter type-inline is-interactive"
  >
    <audio
      class="FilePresenter-audio"
      controls
      :title="tooltip"
      :src="fileInfo?.link ?? undefined"
    ></audio>
  </figure>
  <iframe
    v-else-if="fileInfo?.inlineType === 'iframe'"
    class="FilePresenter type-inline is-interactive"
    :class="{
      ['type-ext-' + fileInfo?.ext]: true,
    }"
    :title="tooltip"
    :width="width"
    :height="height"
    :src="fileInfo?.link ?? undefined"
  ></iframe>
  <span v-else class="FilePresenter type-inline">
    {{ fileInfo?.link }}
  </span>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineAsyncComponent, defineComponent } from 'vue';
import DialogManager from '../../logic/managers/DialogManager';
import UiManager from '../../logic/managers/UiManager';
import type {
  AssetPropValue,
  AssetPropValueFile,
} from '../../logic/types/Props';
import {
  castAssetPropValueToString,
  isFilledAssetPropValue,
} from '../../logic/types/Props';
import { formatFileSize } from '../../logic/utils/format';
import FilePresenterDialog from './FilePresenterDialog.vue';
import { useFilePresenterParams } from './FilePresenter';
import type { ExtendedMenuListItem } from '../../logic/types/MenuList';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { ThumbParams } from '../../logic/utils/files';
import { getSrcByFileId } from '../../logic/utils/files';
import EditorManager from '../../logic/managers/EditorManager';

export default defineComponent({
  name: 'FilePresenter',
  components: {
    BlockWithMenu: defineAsyncComponent(
      () => import('../Common/BlockWithMenu.vue'),
    ),
  },
  props: {
    value: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    inline: { type: Boolean, default: false },
    tooltip: { type: String, default: '' },
    isStatic: { type: Boolean, default: false },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    thumbParams: {
      type: [Object, null] as PropType<ThumbParams | null>,
      default: null,
    },
    menuList: { type: Array<ExtendedMenuListItem>, default: () => [] },
  },
  emits: ['click', 'error'],
  computed: {
    isDesktop() {
      return this.$getAppManager().$appConfiguration.isDesktop;
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    localFilePath() {
      if (this.fileValue?.Store !== 'loc-project') return;
      return getSrcByFileId(this.$getAppManager(), this.fileValue);
    },
    fileTitleParts() {
      const title = this.fileValue?.Title ?? '';
      let last_dot = title.lastIndexOf('.');
      if (last_dot >= 0) last_dot++;
      return {
        title,
        ext: title.substring(last_dot),
        base: title.substring(0, last_dot),
      };
    },
    fileMenu() {
      const menu = [...this.menuList];
      if (this.fileInfo?.inlineType && this.displayAsLink && !this.isStatic) {
        menu.unshift({
          title: this.$t('file.download'),
          icon: 'ri-download-fill',
          action: () => this.downloadFile(),
        });
      }
      return menu;
    },
    isFilled() {
      return isFilledAssetPropValue(this.value);
    },
    fileId() {
      if (!this.fileValue) return null;
      return this.fileValue.FileId;
    },
    fileValue(): AssetPropValueFile | null {
      if (this.value && (this.value as AssetPropValueFile).FileId) {
        return this.value as AssetPropValueFile;
      } else {
        return null;
      }
    },
    stringValue(): string {
      return castAssetPropValueToString(this.value);
    },
    fileTooltip() {
      if (this.tooltip) return this.tooltip;
      if (!this.fileValue) return '';
      return [
        this.fileValue.Title,
        `${this.$t('file.size')}: ${formatFileSize(this.fileValue.Size, (key) => this.$t(key))}`,
        '',
        ...(this.fileInfo?.inlineType
          ? [this.$t('file.clickToOpen'), this.$t('file.ctrlToDownload')]
          : [this.$t('file.clickToDownload')]),
      ].join('\n');
    },
    displayAsLink() {
      if (!this.inline) return true;
      return !this.fileInfo?.inlineType;
    },
    displayAsInline() {
      if (!this.fileValue) return false;
      return !this.displayAsLink;
    },
    fileInfo() {
      return this.fileValue
        ? useFilePresenterParams(this.fileValue, this.thumbParams ?? undefined)
        : null;
    },
  },
  methods: {
    async downloadFile() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          if (!this.fileValue) return;
          await this.$getAppManager()
            .get(EditorManager)
            .downloadAttachment(this.fileValue);
        });
    },
    async linkClick(ev: MouseEvent) {
      if (this.isStatic) return;

      const inside_menu = (ev.target as HTMLElement).closest(
        '.BlockWithMenu-menu.ref-menu',
      );
      if (inside_menu) return;

      this.$emit('click', ev);

      if (ev.defaultPrevented) {
        return;
      }

      if (ev.ctrlKey || ev.metaKey || !this.fileInfo?.inlineType) {
        await this.downloadFile();
      } else {
        this.$getAppManager().get(DialogManager).show(FilePresenterDialog, {
          value: this.value,
        });
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.FilePresenter {
  &.state-error {
    color: var(--color-main-error);
  }

  &.state-empty {
    display: none;
  }

  &.type-link {
    display: inline-flex;
    border: 1px solid var(--local-border-color);
    padding: 5px 10px;
    border-radius: 10px;

    &:not(.state-isStatic) {
      cursor: pointer;
      &:hover {
        border-color: var(--color-accent);
      }
    }
    &.state-selected {
      border-color: var(--color-accent);
    }
  }
}

.FilePresenter-localFile {
  max-width: 100%;
}

.FilePresenter-linkContent {
  display: flex;
  align-items: center;
  white-space: nowrap;
  min-width: 0;
}
.FilePresenter-icon {
  margin-right: 5px;
}

.FilePresenter-basename {
  flex: 1;
  min-width: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
}

figure.FilePresenter {
  margin: 0;
}

.FilePresenter-audio {
  width: 100%;
}
</style>
