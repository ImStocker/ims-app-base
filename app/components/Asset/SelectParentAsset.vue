<template>
  <select-asset-combo-box
    class="SelectParentAsset"
    :readonly="readonly"
    :model-value="parent"
    :placeholder="placeholder"
    :where="selectAssetWhere"
    :additional-options="additionalOptions"
    @update:model-value="changeParent($event)"
  ></select-asset-combo-box>
</template>

<script lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import SelectAssetComboBox from './SelectAssetComboBox.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'SelectParentAsset',
  components: {
    SelectAssetComboBox,
  },
  props: {
    parent: {
      type: Object as PropType<AssetForSelection | null>,
      required: false,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
  },
  emits: ['select-parent'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    selectAssetWhere() {
      return {
        workspaceids:
          this.projectContext
            .get(AssetSubContext)
            .getWorkspaceByNameViaCache('gdd') ?? null,
      };
    },
  },
  methods: {
    changeParent(ev: AssetForSelection | null) {
      this.$emit('select-parent', ev);
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';
</style>
