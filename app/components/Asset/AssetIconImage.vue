<template>
  <file-presenter
    :value="assetImage"
    class="AssetIconImage"
    :inline="true"
    :width="width"
    :height="height"
    :thumb-params="
      width && height
        ? {
            width: width * 2,
            height: height * 2,
            fit: 'cover',
          }
        : null
    "
  ></file-presenter>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type PropType } from 'vue';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { AssetLink, AssetPreviewInfo } from '../../logic/types/AssetsType';
import type { AssetPropValueFile } from '../../logic/types/Props';
import { useAppManager } from '#imports';

const FilePresenter = defineAsyncComponent(
  () => import('../File/FilePresenter.vue'),
);

const props = defineProps({
  asset: {
    type: Object as PropType<AssetLink>,
    required: true,
  },
  width: {
    type: [Number, null],
    default: null,
  },
  height: {
    type: [Number, null],
    default: null,
  },
});

const appManager = useAppManager();

const cachedAssetPreview = computed(() => {
  if (!props.asset) {
    return null;
  }
  const cached = appManager
    .get(CreatorAssetManager)
    .getAssetPreviewViaCacheSync(props.asset.id);
  if (cached === undefined) {
    appManager
      .get(CreatorAssetManager)
      .requestAssetPreviewInCache(props.asset.id);
  }
  return cached;
});

const assetImage = computed(() => {
  const cached_preview = cachedAssetPreview.value;
  if (!cached_preview) return null;
  return getAssetImageFromPreview(cached_preview);
});
</script>

<script lang="ts">
export function getAssetImageFromPreview(preview: AssetPreviewInfo) {
  if (!preview) return null;
  if (
    !preview.mainImage ||
    preview.mainImage.type !== 'file' ||
    !(preview.mainImage.value as AssetPropValueFile).FileId
  ) {
    return null;
  }
  return preview.mainImage.value as AssetPropValueFile;
}
</script>
