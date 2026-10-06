<template>
  <span class="WorkspaceIcon" :style="iconStyle">
    <i class="WorkspaceIcon-icon" :class="iconClass"></i>
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
import { defineComponent, type PropType } from 'vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import UiManager from '../../logic/managers/UiManager';
import {
  WORKSPACE_TYPE_COLLECTION,
  type Workspace,
} from '../../logic/types/Workspaces';
import type { AssetPropValueAsset } from '../../logic/types/Props';
import {
  getWorkspaceColorName,
  getWorkspaceIconClass,
} from '../../logic/utils/workspaceAppearance';
import { resolveAssetIconColor } from '../../logic/utils/assetIconColors';

export default defineComponent({
  name: 'WorkspaceIcon',
  props: {
    workspace: { type: Object as PropType<Workspace>, required: true },
  },
  computed: {
    isCollection() {
      return this.workspace.props?.type === WORKSPACE_TYPE_COLLECTION;
    },
    iconClass(): string {
      return getWorkspaceIconClass(
        this.workspace.props,
        this.isCollection ? 'ri-table-view' : 'ri-folder-fill',
      );
    },
    color(): string | null {
      const theme = this.$getAppManager().get(UiManager).getColorTheme();
      return resolveAssetIconColor(
        getWorkspaceColorName(this.workspace.props),
        theme,
      );
    },
    iconStyle() {
      return this.color ? { color: this.color } : null;
    },
    collectionAssetIcon(): string | null {
      if (this.workspace.props.type !== WORKSPACE_TYPE_COLLECTION) {
        return null;
      }

      const asset_link = this.workspace.props.asset;
      if (asset_link && (asset_link as AssetPropValueAsset).AssetId) {
        const asset = this.$getAppManager()
          .get(CreatorAssetManager)
          .getAssetShortViaCacheSync(
            (asset_link as AssetPropValueAsset).AssetId,
          );
        if (asset && asset.icon) {
          return 'asset-icon-' + asset.icon;
        } else if (asset === undefined) {
          this.$getAppManager()
            .get(CreatorAssetManager)
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
.WorkspaceIcon-icon {
  @include asset-icons.asset-icons;
}
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
