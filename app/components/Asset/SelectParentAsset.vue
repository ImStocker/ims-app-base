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
import { defineComponent, type PropType } from 'vue';
import SelectAssetComboBox from './SelectAssetComboBox.vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { AssetForSelection } from '../../logic/types/AssetsType';

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
  computed: {
    selectAssetWhere() {
      return {
        workspaceids:
          this.$getAppManager()
            .get(ProjectManager)
            .getWorkspaceIdByName('gdd') ?? null,
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
