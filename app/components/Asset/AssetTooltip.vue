<template>
  <div
    class="AssetTooltip"
    :class="{
      'state-with-description': !!assetDescription,
      'state-with-image': !!assetImage,
      'state-with-complete': !!cachedAssetPreview?.completeTrack,
    }"
  >
    <div
      v-if="assetWorkspacesPath.length > 0 && showPath"
      class="AssetTooltip-path"
    >
      <span
        v-for="workspace of assetWorkspacesPath"
        :key="workspace.id"
        class="AssetTooltip-path-segment"
      >
        {{ $tTitle(workspace.title) }} /
      </span>
    </div>
    <file-presenter
      v-if="assetImage"
      :value="assetImage"
      class="AssetTooltip-image"
      :inline="true"
    ></file-presenter>
    <div class="AssetTooltip-title">
      <div class="AssetTooltip-title-content">
        <asset-icon :asset="asset" :use-image="false"></asset-icon>
        {{ assetTitle }}
        <span v-if="assetNotFound" class="AssetTooltip-notFound">{{
          $t('common.notFound')
        }}</span>
      </div>
      <span v-if="assetName" class="AssetTooltip-name">
        <i class="ri-price-tag-3-fill"></i>
        {{ assetName }}
      </span>
    </div>
    <imc-presenter
      v-if="assetDescription"
      class="AssetTooltip-description"
      :value="assetDescription"
    ></imc-presenter>
    <asset-completion-check-label
      v-if="
        cachedAssetPreview?.completeTrack && !cachedAssetPreview?.isAbstract
      "
      class="AssetTooltip-completion"
      :asset-id="asset.id"
    ></asset-completion-check-label>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetLink } from '../../logic/types/AssetsType';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ImcPresenter from '../ImcText/ImcPresenter.vue';
import {
  castAssetPropValueToText,
  joinAssetPropValueTexts,
  truncateAssetPropValueText,
  type AssetPropValueFile,
  type AssetPropValueText,
} from '../../logic/types/Props';
import FilePresenter from '../File/FilePresenter.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { Workspace } from '../../logic/types/Workspaces';
import AssetCompletionCheckLabel from './Completion/AssetCompletionCheckLabel.vue';
import AssetIcon from './AssetIcon.vue';

const TRUNCATE_DESCRIPTION = 300;

export default defineComponent({
  name: 'AssetTooltip',
  components: {
    ImcPresenter,
    FilePresenter,
    AssetCompletionCheckLabel,
    AssetIcon,
  },
  props: {
    asset: { type: Object as PropType<AssetLink>, required: true },
    showPath: { type: Boolean, default: true },
  },
  computed: {
    assetTitle() {
      if (this.cachedAssetShort) {
        return convertTranslatedTitle(
          this.cachedAssetShort.title ?? '',
          (...args) => this.$t(...args),
        );
      } else
        return convertTranslatedTitle(this.asset.title ?? '', (...args) =>
          this.$t(...args),
        );
    },
    assetName() {
      if (this.cachedAssetShort) {
        return this.cachedAssetShort.name;
      } else {
        return this.asset.name;
      }
    },
    assetDescription() {
      if (!this.cachedAssetPreview) {
        return null;
      }
      const tr = truncateAssetPropValueText(
        castAssetPropValueToText(this.cachedAssetPreview.description),
        TRUNCATE_DESCRIPTION,
      );
      let res: AssetPropValueText;
      if (tr.truncated) {
        res = joinAssetPropValueTexts(
          tr.result,
          castAssetPropValueToText('...'),
        );
      } else res = tr.result;
      if (!res.Str.trim()) {
        return null;
      }
      return res;
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
    cachedAssetShort() {
      const cached = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCacheSync(this.asset.id);
      if (cached === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetShortInCache(this.asset.id);
      }
      return cached;
    },
    cachedAssetPreview() {
      if (this.assetNotFound) {
        return null;
      }
      const cached = this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetPreviewViaCacheSync(this.asset.id);
      if (cached === undefined) {
        this.$getAppManager()
          .get(CreatorAssetManager)
          .requestAssetPreviewInCache(this.asset.id);
      }
      return cached;
    },
    hasGddAccess() {
      const role = this.$getAppManager()
        .get(ProjectManager)
        .getUserRoleInProject();
      if (role) return true;
      const project = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project) return false;
      return project.isPublicGdd;
    },
    assetNotFound(): boolean {
      return this.hasGddAccess && this.cachedAssetShort === null;
    },
    assetWorkspacesPath(): Workspace[] {
      const cached_asset = this.cachedAssetShort;
      if (!cached_asset) {
        return [];
      }
      return cached_asset.workspaceId
        ? (this.$getAppManager()
            .get(CreatorAssetManager)
            .getParentWorkspacesListFromCache(cached_asset.workspaceId) ?? [])
        : [];
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetTooltip {
  --local-bg-color: var(--dropdown-bg-color);
  background-color: var(--dropdown-bg-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: var(--dropdown-box-shadow);
  border-radius: var(--dropdown-border-radius);
  padding: 5px 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
}

.AssetTooltip-path {
  grid-column: 1 / 3;
  grid-row: 1;
  color: var(--local-sub-text-color);
  font-size: 12px;
  margin-bottom: 2px;
}

.AssetTooltip-image {
  grid-column: 1;
  grid-row: 2 / 5;
  margin-right: 10px;
  max-width: 100px;
  max-height: 100px;
}

.AssetTooltip-title {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.AssetTooltip-title-content {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  flex: 1;
  align-items: center;
}

.AssetTooltip-name {
  color: var(--local-sub-text-color);
  font-size: 12px;
}

.AssetTooltip-description {
  grid-column: 2;
  grid-row: 3;
  font-size: 12px;
  margin-top: 5px;
  max-height: 50dvh;
  overflow: hidden;
  min-width: 150px;
}

.AssetTooltip-completion {
  grid-column: 2;
  grid-row: 4;
  font-size: 12px;
  margin-top: 5px;
}

.AssetTooltip.state-with-description,
.AssetTooltip.state-with-image,
.AssetTooltip.state-with-complete {
  .AssetTooltip-title-content {
    font-weight: 600;
  }
}

.AssetTooltip-notFound {
  color: var(--color-main-error);
}
</style>
