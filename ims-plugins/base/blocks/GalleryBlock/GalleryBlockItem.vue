<template>
  <div class="GalleryBlockItem">
    <file-presenter
      v-if="item.type === 'file'"
      :inline="true"
      class="GalleryBlockItem-content"
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
      class="GalleryBlockItem-badges"
      :class="{ 'state-active': item.index === shownDropdownMenuIdx }"
    >
      <menu-button
        v-if="!readonly"
        class="GalleryBlockItem-badges-one GalleryBlockItem-menu"
        @show="shownDropdownMenuIdx = item.index"
        @hide="shownDropdownMenuIdx = null"
      >
        <menu-list :menu-list="getMenuList(item)"></menu-list>
      </menu-button>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, inject } from 'vue';
import UiManager from '#logic/managers/UiManager';
import {
  type AssetPropValueFile,
  castAssetPropValueToString,
} from '#logic/types/Props';
import MenuButton from '#components/Common/MenuButton.vue';
import FilePresenter from '#components/File/FilePresenter.vue';
import FilePresenterDialog from '#components/File/FilePresenterDialog.vue';
import type { GalleryBlockItemObject } from './GalleryBlock';
import GalleryBlockVideo from './GalleryBlockVideo.vue';
import MenuList from '#components/Common/MenuList.vue';
import { DialogSubContext } from '#logic/project-sub-contexts/DialogSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';

export default defineComponent({
  name: 'GalleryBlockItem',
  components: {
    FilePresenter,
    MenuButton,
    GalleryBlockVideo,
    MenuList,
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
  },
  emits: ['save', 'delete'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  data() {
    return {
      loadDone: false,
      shownDropdownMenuIdx: null as number | null,
    };
  },
  computed: {
    projectId() {
      return this.projectContext.projectInfo?.id;
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
  },
  methods: {
    getMenuList(_item: GalleryBlockItemObject) {
      return [
        {
          title: this.$t('assetEditor.blockMenu.delete'),
          action: () => this.$emit('delete'),
          icon: 'delete',
          danger: true,
        },
      ];
    },
    extimageClick() {
      this.projectContext.get(DialogSubContext).show(FilePresenterDialog, {
        value: this.itemValueAsString,
        files: this.files.map((el) => el.value),
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
            await this.projectContext
              .get(EditorSubContext)
              .downloadAttachment(file);
          });
      } else {
        this.projectContext.get(DialogSubContext).show(FilePresenterDialog, {
          value: file,
          files: this.files.map((el) => el.value),
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
}

.GalleryBlockItem-badges {
  position: absolute;
  top: 0px;
  right: 0px;
  background-color: var(--local-bg-color);
  display: none;
  border-bottom-left-radius: 2px;
  color: var(--local-text-color);

  &.state-active {
    display: flex;
  }
}

.GalleryBlockItem-badges-one {
  padding: 2px 2px 0;

  &.GalleryBlockItem-menu {
    padding: 0;
  }

  &:first-child {
    border-bottom-left-radius: 2px;
  }
}

.GalleryBlockItem:hover {
  .GalleryBlockItem-badges {
    display: flex;
  }
}
</style>
