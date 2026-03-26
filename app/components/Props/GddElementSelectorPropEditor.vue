<template>
  <asset-selector-prop-editor
    v-if="gddWorkpaceId"
    ref="input"
    class="GddElementSelectorPropEditor"
    :model-value="modelValue"
    :nullable="nullable"
    :where="selectorWhere"
    :has-create-new-option="hasCreateNewOption"
    @update:model-value="$emit('update:modelValue', $event)"
  ></asset-selector-prop-editor>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, inject } from 'vue';
import type {
  AssetPropValue,
  AssetPropValueAsset,
} from '../../logic/types/Props';
import AssetSelectorPropEditor from './AssetSelectorPropEditor.vue';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';

export default defineComponent({
  name: 'GddElementSelectorPropEditor',
  components: {
    AssetSelectorPropEditor,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    nullable: { type: Boolean, default: true },
    type: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    hasCreateNewOption: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    gddWorkpaceId() {
      return this.projectContext
        .get(AssetSubContext)
        .getWorkspaceByNameViaCacheSync('gdd')?.id;
    },
    selectorWhere() {
      const where: AssetPropWhere = {
        workspaceids: this.gddWorkpaceId,
      };
      if (this.type && (this.type as AssetPropValueAsset).AssetId) {
        where.typeids = (this.type as AssetPropValueAsset).AssetId;
      }
      return where;
    },
  },
  methods: {
    activate() {
      const input = this.$refs.input as InstanceType<
        typeof AssetSelectorPropEditor
      >;
      if (!input) return;
      input.activate();
    },
    focus() {
      const input = this.$refs.input as InstanceType<
        typeof AssetSelectorPropEditor
      >;
      if (!input) return;
      input.focus();
    },
  },
});
</script>

<style lang="scss" scoped></style>
