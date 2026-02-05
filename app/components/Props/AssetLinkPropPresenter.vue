<template>
  <div class="AssetLinkPropPresenter">
    <template v-if="!valueParsed.error">
      <div v-if="loading" class="AssetLinkPropPresenter-asset state-loading">
        {{ valueParsed.title }}
      </div>
      <div
        v-else-if="loadingError"
        class="AssetLinkPropPresenter-asset state-error"
        :title="loadingError"
      >
        {{ valueParsed.title }}
      </div>
      <asset-link
        v-else-if="displayingAsset && displayingAsset.id"
        :project="projectContextComp.projectInfo"
        :asset="displayingAsset"
        class="AssetLinkPropPresenter-asset"
        :open-popup="true"
      ></asset-link>
      <div v-else-if="displayingAsset" class="AssetLinkPropPresenter-asset">
        {{ displayingAssetTitle }}
      </div>
    </template>
    <div v-else-if="!modelValue" class="AssetLinkPropPresenter-notSet">
      {{ $t('assetEditor.valueNotSet') }}
    </div>
    <div v-else-if="allowCustom" class="AssetLinkPropPresenter-customValue">
      {{ valueParsed.title }}
    </div>
    <div
      v-else
      class="AssetLinkPropPresenter-badValue"
      :title="$t('assetEditor.badValue')"
    >
      {{ valueParsed.title }}
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetShort } from '../../logic/types/AssetsType';
import type {
  AssetPropValue,
  AssetPropValueAsset,
} from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import { assert } from '../../logic/utils/typeUtils';
import AssetLink from '../Asset/AssetLink.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  name: 'AssetLinkPropPresenter',
  components: { AssetLink },
  inject: ['projectContext'],
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    allowCustom: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  data() {
    return {
      loading: false,
      loadingEpoch: 0,
      loadedAsset: null as AssetShort | null,
      loadingError: null as string | null,
    };
  },
  computed: {
    projectContextComp() {
      assert(this.projectContext, 'projectContext is not provided');
      return this.projectContext as IProjectContext;
    },
    displayingAssetTitle(): string {
      if (!this.displayingAsset) return '';
      return convertTranslatedTitle(
        this.displayingAsset.title
          ? this.displayingAsset.title
          : (this.displayingAsset.name ?? ''),
        (key) => this.$t(key),
      );
    },
    displayingAsset(): {
      id: string;
      title: string | null;
      name: string | null;
      icon: string | null;
    } | null {
      if (this.loadedAsset) return this.loadedAsset;
      else if (!this.valueParsed.error) {
        return {
          id: this.valueParsed.assetId ?? '',
          icon: null,
          title: this.valueParsed.title,
          name: null,
        };
      } else return null;
    },
    valueParsed(): {
      error: boolean;
      assetId: string | null;
      title: string | null;
    } {
      const asset_link = this.modelValue as AssetPropValueAsset;
      if (asset_link && asset_link.AssetId) {
        return {
          error: false,
          assetId: asset_link.AssetId,
          title: asset_link.Title ? asset_link.Title : asset_link.Name,
        };
      } else {
        return {
          error: true,
          assetId: null,
          title: castAssetPropValueToString(this.modelValue),
        };
      }
    },
  },
  watch: {
    valueParsed() {
      this.loadAsset();
    },
  },
  mounted() {
    this.loadAsset();
  },
  methods: {
    async loadAsset() {
      this.loadingError = null;
      if (!this.valueParsed.assetId) {
        this.loading = false;
        this.loadedAsset = null;
      } else {
        this.loading = true;
        const epoch = ++this.loadingEpoch;
        try {
          const asset = await this.projectContextComp.getAssetShortViaCache(
            this.valueParsed.assetId,
          );
          if (this.loadingEpoch === epoch) {
            this.loadedAsset = asset;
            this.loading = false;
          }
        } catch (err: any) {
          if (this.loadingEpoch === epoch) {
            this.loadingError = err.message;
            this.loading = false;
          }
        }
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';

.AssetLinkPropPresenter-badValue {
  color: var(--color-main-error);
  font-style: italic;
}
.AssetLinkPropPresenter {
  padding: 5px;
}

.AssetLinkPropPresenter-asset {
  color: var(--local-link-color);
  text-decoration: none;
}

.AssetLinkPropPresenter-notSet {
  color: var(--local-sub-text-color);
  font-style: italic;
}
</style>
