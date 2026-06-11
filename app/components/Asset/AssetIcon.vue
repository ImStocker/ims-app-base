<template>
  <span
    class="AssetIcon"
    :class="{
      ['asset-icon-' +
      (displayingAssetIcon ? displayingAssetIcon : 'file-fill')]: !assetImage,
    }"
    ><asset-icon-image
      v-if="assetImage"
      class="AssetIcon-image"
      :asset="asset"
      :width="16"
      :height="16"
    ></asset-icon-image>
  </span>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetLink } from '../../logic/types/AssetsType';
import { getAssetImageFromPreview } from './AssetIconImage.vue';

export default defineComponent({
  name: 'AssetIcon',
  components: {
    AssetIconImage: defineAsyncComponent(() => import('./AssetIconImage.vue')),
  },
  props: {
    asset: { type: Object as PropType<AssetLink>, required: true },
    useImage: { type: Boolean, default: true },
  },
  computed: {
    hasImage() {
      return !!this.cachedAsset?.hasImage;
    },
    cachedAsset() {
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
      if (!this.cachedAsset) {
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
    assetImage() {
      if (!this.hasImage) {
        return null;
      }
      if (!this.useImage) {
        return null;
      }
      const cached_preview = this.cachedAssetPreview;
      if (!cached_preview) return null;
      return getAssetImageFromPreview(cached_preview);
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
