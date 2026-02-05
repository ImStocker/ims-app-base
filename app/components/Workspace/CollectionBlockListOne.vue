<template>
  <div v-if="projectInfo" class="CollectionBlockListOne">
    <div
      v-if="assetImage || alwaysShowImageZone"
      class="CollectionBlockListOne-image-zone"
    >
      <asset-link
        v-if="assetImage"
        class="CollectionBlockListOne-image"
        :asset="assetLink"
        :show-tooltip="false"
        :project="projectInfo"
        :show-icon="false"
        :show-loading="false"
      >
        <file-presenter
          :value="assetImage"
          class="CollectionBlockListOne-image-inner"
          :inline="true"
        ></file-presenter
      ></asset-link>
    </div>
    <div class="CollectionBlockListOne-content">
      <div
        v-for="(column, columnIndex) of columns"
        :key="column.name"
        class="CollectionBlockListOne-content-item"
      >
        <div
          v-if="column.propKey === 'title'"
          class="CollectionBlockListOne-content-item-link"
        >
          <asset-link
            class="CollectionBlockListOne-content-item-link-elem"
            :asset="assetLink"
            :show-tooltip="false"
            :project="projectInfo"
          ></asset-link>
        </div>
        <template v-else>
          <div class="CollectionBlockListOne-content-item-prop">
            <caption-string :value="column.propTitle"></caption-string>:
          </div>
          <props-block-value-stack
            class="CollectionBlockListOne-content-item-value"
            :form-state="row.values[columnIndex].formState"
            :field="row.values[columnIndex].field"
            :edit-mode="false"
          ></props-block-value-stack>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import PropsBlockValueStack from '~ims-plugin-base/blocks/PropsBlock/PropsBlockValueStack.vue';
import CaptionString from '../Common/CaptionString.vue';
import AssetLink from '../Asset/AssetLink.vue';
import FilePresenter from '../File/FilePresenter.vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { AssetPropValueFile } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import type { ImcGridColumn, ImcGridRow } from '../ImcGrid/ImcGrid';

export default defineComponent({
  name: 'CollectionBlockListOne',
  components: {
    PropsBlockValueStack,
    CaptionString,
    FilePresenter,
    AssetLink,
  },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    row: { type: Object as PropType<ImcGridRow>, required: true },
    alwaysShowImageZone: { type: Boolean, default: false },
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    assetLink() {
      const title_column_index = this.columns.findIndex(
        (c) => c.propKey === 'title',
      );
      const title_row =
        title_column_index >= 0 ? this.row.values[title_column_index] : null;
      return {
        id: this.row.id,
        title: title_row
          ? castAssetPropValueToString(title_row.formState.combined.title)
          : undefined,
        icon: title_row
          ? castAssetPropValueToString(title_row.formState.combined.icon)
          : undefined,
      };
    },
    assetImage() {
      const cached_preview = this.cachedAssetPreview;
      if (!cached_preview) return null;
      if (
        !cached_preview.mainImage ||
        cached_preview.mainImage.type !== 'file' ||
        !(cached_preview.mainImage.value as AssetPropValueFile).FileId
      ) {
        return null;
      }
      return cached_preview.mainImage.value as AssetPropValueFile;
    },
    cachedAssetPreview() {
      const cached = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetPreviewViaCacheSync(this.row.id);
      if (cached === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetPreviewInCache(this.row.id);
      }
      return cached;
    },
  },
  methods: {},
});
</script>

<style lang="scss" scoped>
.CollectionBlockList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.CollectionBlockListOne {
  border: 1px solid var(--local-border-color);
  border-radius: 4px;
  width: 100%;
  display: flex;
  align-items: center;
}
.CollectionBlockListOne-image-zone {
  display: block;
  width: 10%;
  min-width: 100px;
  padding: 5px 0px 5px 5px;
}
.CollectionBlockListOne-image-inner {
  width: 100%;
  border: 1px solid transparent;
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  max-height: 100px;
  object-fit: contain;
}
.CollectionBlockListOne-content {
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.CollectionBlockListOne-content-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.CollectionBlockListOne-content-item-prop {
  font-weight: bold;
}
.CollectionBlockListOne-content-item-link-elem {
  text-decoration: none;
}
</style>
