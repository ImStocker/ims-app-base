<template>
  <select-asset-combo-box
    ref="input"
    class="AssetSelectorPropEditor"
    :class="{
      'state-value-bad': selectedAsset?.bad ?? false,
    }"
    :clearable="nullable"
    :model-value="selectedAsset"
    :has-create-new-option="hasCreateNewOption"
    :where="where"
    @update:model-value="onSelected($event)"
  ></select-asset-combo-box>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueAsset,
} from '../../logic/types/Props';
import {
  castAssetPropValueToString,
  sameAssetPropValues,
} from '../../logic/types/Props';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import type {
  AssetForSelection,
  AssetShort,
} from '../../logic/types/AssetsType';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import SelectAssetComboBox from '../Asset/SelectAssetComboBox.vue';
import { assert } from '../../logic/utils/typeUtils';

export default defineComponent({
  name: 'AssetSelectorPropEditor',
  components: {
    SelectAssetComboBox,
  },
  inject: ['projectContext'],
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    nullable: { type: Boolean, default: true },
    where: { type: Object as PropType<AssetPropWhere | null>, default: null },
    allowCustom: { type: Boolean, default: false },
    hasCreateNewOption: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      loading: false,
      loadingError: null as string | null,
      loadingEpoch: 0,
      options: [] as AssetShort[],
    };
  },
  computed: {
    projectContextComp() {
      assert(this.projectContext, 'projectContext is not provided');
      return this.projectContext as IProjectContext;
    },
    modelValueAsset(): AssetPropValueAsset | null {
      if (this.modelValue && (this.modelValue as AssetPropValueAsset).AssetId) {
        return this.modelValue as AssetPropValueAsset;
      } else return null;
    },
    selectedAsset(): (AssetForSelection & { bad: boolean }) | null {
      if (this.modelValueAsset) {
        const from_cache = this.projectContextComp.getAssetShortViaCacheSync(
          this.modelValueAsset.AssetId,
        );
        return {
          id: this.modelValueAsset.AssetId,
          title: this.modelValueAsset.Title,
          name: this.modelValueAsset.Name,
          icon: from_cache ? from_cache.icon : null,
          bad: false,
        };
      } else if (this.modelValue) {
        const str = castAssetPropValueToString(this.modelValue);
        return {
          id: '',
          title: str,
          icon: null,
          name: null,
          bad: true,
        };
      } else {
        return null;
      }
    },
  },
  watch: {
    modelValueAsset() {
      if (this.modelValueAsset) {
        this.projectContextComp.requestAssetShortInCache(
          this.modelValueAsset.AssetId,
        );
      }
    },
  },
  mounted() {
    if (this.modelValueAsset) {
      this.projectContextComp.requestAssetShortInCache(
        this.modelValueAsset.AssetId,
      );
    }
  },
  methods: {
    onSelected(val: AssetForSelection) {
      let new_prop_val: AssetPropValue = null;
      if (val) {
        if (val.id) {
          new_prop_val = {
            AssetId: val.id,
            Title: val.title ?? '',
            Name: val.name,
          };
        } else if (val.title && this.allowCustom) {
          new_prop_val = val.title;
        }
      }

      if (!sameAssetPropValues(this.modelValue, new_prop_val)) {
        this.$emit('update:modelValue', new_prop_val);
      }
    },
    focus() {
      const input = this.$refs.input as InstanceType<
        typeof SelectAssetComboBox
      >;
      if (!input) return;
      input.focus();
    },
    activate() {
      const input = this.$refs.input as InstanceType<
        typeof SelectAssetComboBox
      >;
      if (!input) return;
      input.activate();
    },
  },
});
</script>

<style lang="scss" scoped>
.AssetSelectorPropEditor.state-value-bad:deep(
    .SelectAssetComboBox-menu-button.ref-selectedValue
  ) {
  color: var(--color-main-error);
  .SelectAssetComboBox-menu-icon-parent {
    display: none;
  }
}
</style>
