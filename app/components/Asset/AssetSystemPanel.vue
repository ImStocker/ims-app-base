<template>
  <div class="AssetSystemPanel">
    {{ $t('baseObjects.baseObject') }}
    <button
      class="is-button accent"
      :class="{ loading: isCreating }"
      :disabled="isCreating"
      @click="createBaseEditableAsset()"
    >
      {{ $t('baseObjects.clickToEdit') }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import UiManager from '../../logic/managers/UiManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import { openProjectLink } from '../../logic/router/routes-helpers';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';

export default defineComponent({
  name: 'AssetSystemPanel',
  props: {
    currentAssetFull: {
      type: Object as PropType<AssetFullInstanceR>,
      required: true,
    },
  },
  data() {
    return {
      isCreating: false,
    };
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  methods: {
    async createBaseEditableAsset() {
      if (this.isCreating) {
        return;
      }
      const base_asset = this.currentAssetFull;
      if (!base_asset) {
        return;
      }

      this.isCreating = true;
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          let target_workspace_id: string | null = null;
          const base_workspace = base_asset.workspaceId
            ? ((
                await this.$getAppManager()
                  .get(CreatorAssetManager)
                  .getWorkspacesList({
                    where: {
                      ids: [base_asset.workspaceId],
                      isSystem: true,
                    },
                  })
              ).list[0] ?? null)
            : null;

          if (base_workspace && base_workspace.name) {
            target_workspace_id = this.$getAppManager()
              .get(ProjectManager)
              .getWorkspaceIdByName(base_workspace.name);
          }

          if (!target_workspace_id) {
            target_workspace_id = this.$getAppManager()
              .get(ProjectManager)
              .getWorkspaceIdByName('settings');
          }

          const result = await this.$getAppManager()
            .get(CreatorAssetManager)
            .createAsset({
              id: base_asset.id,
              set: {
                title: base_asset.ownTitle ?? undefined,
                parentIds: base_asset.parentIds,
                name: base_asset.name ?? undefined,
                icon: base_asset.ownIcon ?? undefined,
                workspaceId: target_workspace_id,
                isAbstract: base_asset.isAbstract,
              },
            });
          if (this.projectInfo) {
            await openProjectLink(this.$getAppManager(), this.projectInfo, {
              name: 'project-asset-by-id',
              params: {
                assetId: result.ids[0],
              },
            });
          }
        });
      this.isCreating = false;
    },
  },
});
</script>
<style lang="scss">
.AssetSystemPanel {
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 20px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
