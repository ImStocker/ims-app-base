<template>
  <div class="ExternalPluginBlock">
    <div
      v-if="externalPluginLoading"
      class="ExternalPluginBlock-loading loaderSpinner"
    ></div>
    <div
      v-else-if="externalPluginComponentError"
      class="ExternalPluginBlock-error error-message-block"
    >
      {{ externalPluginComponentError }}
    </div>
    <div ref="target"></div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetChanger } from '../logic/types/AssetChanger';
import type {
  AssetDisplayMode,
  ResolvedAssetBlock,
} from '../logic/utils/assets';
import type ExternalPluginBlockTypeDefinition from '../logic/types/ExternalPluginBlockTypeDefinition';
import type { ExternalPluginComponentApi } from '../logic/types/ExternalPluginBlockTypeDefinition';

export default defineComponent({
  name: 'ExternalPluginBlock',
  props: {
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    blockTypeDefinition: {
      type: Object as PropType<ExternalPluginBlockTypeDefinition>,
      required: true,
    },
  },
  data() {
    let mountResolve!: (success: boolean) => void;
    const mountPromise = new Promise<boolean>((res) => (mountResolve = res));

    return {
      externalPluginLoading: false,
      externalPluginComponentError: null as null | string,
      mountResolve,
      mountPromise,
      externalComponentApi: null as null | ExternalPluginComponentApi,
    };
  },
  async mounted() {
    this.externalComponentApi = await this.blockTypeDefinition.componentApi();

    if (this.externalComponentApi.onMounted) {
      this.externalComponentApi.onMounted(this.$refs['target'] as HTMLElement);
    }
  },
  unmounted() {
    this.mountResolve(false);
    if (this.externalComponentApi?.onUnmounted) {
      this.externalComponentApi.onUnmounted();
    }
  },
});
</script>
