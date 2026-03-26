<template>
  <span
    class="AssetIcon"
    :class="{
      ['asset-icon-' +
      (displayingAssetIcon ? displayingAssetIcon : 'file-fill')]: !assetImage,
    }"
    ><file-presenter
      v-if="assetImage"
      :value="assetImage"
      class="AssetIcon-image"
      :inline="true"
      :width="16"
      :height="16"
      :thumb-params="{ width: 32, height: 32, fit: 'cover' }"
    ></file-presenter
  ></span>
</template>

<script type="text/ecmascript-6" lang="ts">
import {
  defineAsyncComponent,
  defineComponent,
  inject,
  type PropType,
} from 'vue';
import type { AssetLink } from '../../logic/types/AssetsType';
import type { AssetPropValueFile } from '../../logic/types/Props';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'AssetIcon',
  components: {
    FilePresenter: defineAsyncComponent(
      () => import('../File/FilePresenter.vue'),
    ),
  },
  props: {
    asset: { type: Object as PropType<AssetLink>, required: true },
    useImage: { type: Boolean, default: true },
  },
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    hasImage() {
      return !!this.cachedAsset?.hasImage;
    },
    cachedAsset() {
      const cached = this.projectContext
        .get(AssetSubContext)
        .getAssetShortViaCacheSync(this.asset.id);
      if (cached === undefined) {
        this.projectContext
          .get(AssetSubContext)
          .requestAssetShortInCache(this.asset.id);
      }
      return cached;
    },
    cachedAssetPreview() {
      if (!this.cachedAsset) {
        return null;
      }
      const cached = this.projectContext
        .get(AssetSubContext)
        .getAssetPreviewViaCacheSync(this.asset.id);
      if (cached === undefined) {
        this.projectContext
          .get(AssetSubContext)
          .requestAssetPreviewInCache(this.asset.id);
      }
      return cached;
    },
    assetImage() {
      if (!this.hasImage) {
        return null;
      }
      if (!this.useImage) {
        return null;
      }
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
    displayingAssetIcon(): string | null {
      if (this.cachedAsset) {
        return this.cachedAsset.icon;
      }
      if (this.asset.icon !== undefined) return this.asset.icon;
      return null;
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
.AssetIcon {
  margin-right: 2px;
  position: relative;
  font-size: calc(var(--asset-icon-size, 16px) - 2px);
  display: inline-block;
  width: var(--asset-icon-size, 16px);
  text-align: center;

  @include asset-icons.asset-icons;
}
.AssetIcon-image {
  height: var(--asset-icon-size, 16px);
  width: var(--asset-icon-size, 16px);
  display: block;
  border-radius: 50%;
}
</style>
