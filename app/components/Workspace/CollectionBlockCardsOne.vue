<template>
  <div v-if="projectInfo" class="CollectionBlockCardsOne">
    <div v-if="assetImage" class="CollectionBlockCardsOne-image-zone">
      <asset-link
        class="CollectionBlockCardsOne-image"
        :asset="assetLink"
        :show-tooltip="false"
        :project="projectInfo"
        :show-icon="false"
        :show-loading="false"
      >
        <file-presenter
          :value="assetImage"
          class="CollectionBlockCardsOne-image-inner"
          :inline="true"
        ></file-presenter
      ></asset-link>
    </div>
    <div class="CollectionBlockCardsOne-content">
      <div
        v-for="(column, columnIndex) of columns"
        :key="column.name"
        class="CollectionBlockCardsOne-content-item"
      >
        <div
          v-if="column.propKey === 'title'"
          class="CollectionBlockCardsOne-content-item-link"
        >
          <asset-link
            class="CollectionBlockCardsOne-content-item-link-elem"
            :asset="assetLink"
            :show-tooltip="false"
            :project="projectInfo"
          ></asset-link>
        </div>
        <template v-else>
          <div class="CollectionBlockCardsOne-content-item-prop">
            <caption-string :value="column.propTitle"></caption-string>:
          </div>
          <props-block-value-stack
            class="CollectionBlockCardsOne-content-item-value"
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
import type { ImcGridColumn, ImcGridRow } from '../ImcGrid/ImcGrid';
import {
  castAssetPropValueToString,
  type AssetPropValueFile,
} from '../../logic/types/Props';
import ProjectManager from '../../logic/managers/ProjectManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import PropsBlockValueStack from '~ims-plugin-base/blocks/PropsBlock/PropsBlockValueStack.vue';
import CaptionString from '../Common/CaptionString.vue';
import AssetLink from '../Asset/AssetLink.vue';
import FilePresenter from '../File/FilePresenter.vue';

export default defineComponent({
  name: 'CollectionBlockCardsOne',
  components: {
    PropsBlockValueStack,
    CaptionString,
    AssetLink,
    FilePresenter,
  },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    row: { type: Object as PropType<ImcGridRow>, required: true },
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
.CollectionBlockCardsOne {
  border: 1px solid var(--local-border-color);
  border-radius: 4px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.CollectionBlockCardsOne-image-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  padding: 5px 5px 0;
}
.CollectionBlockCardsOne-image-inner {
  width: 100%;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
  max-height: 200px;
  object-fit: contain;
}
.CollectionBlockCardsOne-content {
  display: flex;
  flex-direction: column;
  padding: 10px;
}
.CollectionBlockCardsOne-content-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.CollectionBlockCardsOne-content-item-prop {
  font-weight: bold;
}
.CollectionBlockCardsOne-content-item-link {
  text-align: center;
}
.CollectionBlockCardsOne-content-item-link-elem {
  text-decoration: none;
}
</style>
