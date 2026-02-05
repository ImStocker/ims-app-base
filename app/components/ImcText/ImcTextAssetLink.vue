<template>
  <asset-link
    :project="project"
    :asset="asset"
    :target="target"
    :open-popup="openPopup"
    :exact="exact"
    :show-icon="showIcon"
    @click="$emit('click', $event)"
    ><template v-if="text" #default>{{ text }}</template></asset-link
  >
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import './quill-init';
import AssetLink from '../Asset/AssetLink.vue';
import type { AssetLink as AssetLinkType } from '../../logic/types/AssetsType';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';

export default defineComponent({
  name: 'ImcTextAssetLink',
  components: {
    AssetLink,
  },
  props: {
    text: { type: [String, null], default: null },
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    asset: { type: Object as PropType<AssetLinkType>, required: true },
    target: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    openPopup: { type: Boolean, default: false },
    exact: { type: Boolean, default: false },
    showIcon: { type: Boolean, default: true },
  },
  emits: ['click'],
});
</script>
