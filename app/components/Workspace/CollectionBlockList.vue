<template>
  <div class="CollectionBlockList">
    <collection-block-list-one
      v-for="row of rows"
      :key="row.id"
      :row="row"
      :columns="columns"
      class="CollectionBlockList-Row"
      :always-show-image-zone="hasImages"
    ></collection-block-list-one>
  </div>
  <div v-if="userRole" class="CollectionBlockList-controls use-buttons-action">
    <button
      class="is-button"
      :class="{
        loading: vm.assetsContent.addBusy,
      }"
      @click="addListItem"
    >
      {{ $t('sourcePage.folders.collection.addListItem') }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import type { ImcGridColumn, ImcGridRow } from '../ImcGrid/ImcGrid';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetPropValueFile } from '../../logic/types/Props';
import CollectionBlockListOne from './CollectionBlockListOne.vue';
import type { WorkspaceCollectionPageVM } from '../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import ProjectManager from '../../logic/managers/ProjectManager';
import UiManager from '../../logic/managers/UiManager';
import FastCreateAssetDialog from '../Asset/FastCreateAssetDialog.vue';
import DialogManager from '../../logic/managers/DialogManager';
import AssetPreviewDialog from '../Asset/AssetPreviewDialog.vue';

export default defineComponent({
  name: 'CollectionBlockList',
  components: {
    CollectionBlockListOne,
  },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    rows: { type: Array<ImcGridRow>, required: true },
    workspaceId: { type: String, default: null },
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
  },
  data() {
    return {
      hasImages: false,
    };
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  watch: {
    rows() {
      this.updateHasImages();
    },
  },
  mounted() {
    this.updateHasImages();
  },
  methods: {
    async updateHasImages() {
      const previews = await Promise.all(
        this.rows.map((row) =>
          this.$getAppManager()
            .get(CreatorAssetManager)
            .getAssetPreviewViaCache(row.id),
        ),
      );
      this.hasImages = previews.some((preview) => {
        return (
          preview &&
          preview.mainImage &&
          preview.mainImage.type === 'file' &&
          (preview.mainImage.value as AssetPropValueFile).FileId
        );
      });
    },
    async addListItem() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const created = await this.$getAppManager()
            .get(DialogManager)
            .show(FastCreateAssetDialog, {
              set: {
                parentIds: this.vm.baseAsset?.id ? [this.vm.baseAsset.id] : [],
                workspaceId: this.vm.workspaceId,
              },
              disableChangeType: true,
            });

          if (!created) return;

          await this.$getAppManager()
            .get(DialogManager)
            .show(AssetPreviewDialog, {
              assetId: created.id,
            });

          await this.vm.assetsContent.reload(false, true);
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.CollectionBlockList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}
</style>
