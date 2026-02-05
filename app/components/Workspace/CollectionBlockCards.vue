<template>
  <div class="CollectionBlockCards">
    <workspace-collection-cards-one
      v-for="row of rows"
      :key="row.id"
      :columns="columns"
      :row="row"
      class="CollectionBlockCards-Card"
    ></workspace-collection-cards-one>
  </div>
  <div v-if="userRole" class="CollectionBlockCards-controls use-buttons-action">
    <button
      class="is-button"
      :class="{
        loading: vm.assetsContent.addBusy,
      }"
      @click="addCard"
    >
      {{ $t('sourcePage.folders.collection.addCard') }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import AssetPreviewDialog from '../Asset/AssetPreviewDialog.vue';
import FastCreateAssetDialog from '../Asset/FastCreateAssetDialog.vue';
import WorkspaceCollectionCardsOne from './CollectionBlockCardsOne.vue';
import DialogManager from '../../logic/managers/DialogManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import UiManager from '../../logic/managers/UiManager';
import type { WorkspaceCollectionPageVM } from '../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { ImcGridColumn, ImcGridRow } from '../ImcGrid/ImcGrid';

export default defineComponent({
  name: 'CollectionBlockCards',
  components: {
    WorkspaceCollectionCardsOne,
  },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    rows: { type: Array<ImcGridRow>, required: true },
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  methods: {
    showProp(column: ImcGridColumn) {
      return column.propKey !== 'title';
    },
    async addCard() {
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
.CollectionBlockCards {
  gap: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  margin-bottom: 10px;
}
</style>
