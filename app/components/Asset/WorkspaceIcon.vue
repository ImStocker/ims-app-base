<template>
  <span class="WorkspaceIcon">
    <i :class="isCollection ? 'ri-table-view' : 'ri-folder-fill'"></i>
    <span
      v-if="collectionAssetIcon"
      class="WorkspaceIcon-collection-assetAnchor"
    >
      <span
        class="WorkspaceIcon-collection-asset"
        :class="collectionAssetIcon"
      ></span>
    </span>
  </span>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
} from '../../logic/types/Workspaces';
import type { AssetPropValueAsset } from '../../logic/types/Props';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

export default defineComponent({
  name: 'WorkspaceIcon',
  props: {
    workspace: { type: Object as PropType<Workspace>, required: true },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    isCollection() {
      return this.workspace.props?.type === WORKSPACE_TYPE_COLLECTION;
    },
    collectionAssetIcon(): string | null {
      if (this.workspace.props.type !== WORKSPACE_TYPE_COLLECTION) {
        return null;
      }

      const asset_link = this.workspace.props.asset;
      if (asset_link && (asset_link as AssetPropValueAsset).AssetId) {
        const asset = this.projectContext
          .get(AssetSubContext)
          .getAssetShortViaCacheSync(
            (asset_link as AssetPropValueAsset).AssetId,
          );
        if (asset && asset.icon) {
          return 'asset-icon-' + asset.icon;
        } else if (asset === undefined) {
          this.projectContext
            .get(AssetSubContext)
            .requestAssetShortInCache(
              (asset_link as AssetPropValueAsset).AssetId,
            );
        }
      }

      return null;
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
.WorkspaceIcon-collection-assetAnchor {
  position: relative;
  display: inline-block;
  width: 0;
}
.WorkspaceIcon-collection-asset {
  @include asset-icons.asset-icons;
  position: absolute;
  right: -2px;
  bottom: -5px;
  font-size: 12px;
  background: var(--local-bg-color);
  height: 12px;
  line-height: 12px;
  border-radius: 50%;
}
</style>
