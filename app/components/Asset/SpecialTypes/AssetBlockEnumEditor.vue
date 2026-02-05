<template>
  <is-panel class="AssetBlockEnumEditor">
    <enum-editor
      v-if="infoBlock"
      :block="infoBlock"
      :asset-changer="assetChanger"
      :readonly="isReadonly"
    ></enum-editor>
  </is-panel>
</template>
<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import ProjectManager from '../../../logic/managers/ProjectManager';
import EnumEditor from './EnumEditor.vue';
import type { AssetChanger } from '../../../logic/types/AssetChanger';
import IsPanel from '../../Common/IsPanel.vue';

export default defineComponent({
  name: 'AssetBlockEnumEditor',
  components: {
    EnumEditor,
    IsPanel,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    hiddenBlockNames: {
      type: Array<string>,
      default: () => [],
    },
    requestRootToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      required: true,
    },
  },
  emits: ['delete', 'update:is-dirty'],
  data() {
    return {};
  },
  computed: {
    assetChanger(): AssetChanger {
      return this.assetBlockEditor.assetChanger as AssetChanger;
    },
    resolvedBlocks() {
      return this.assetBlockEditor.resolveBlocks();
    },
    infoBlock() {
      return this.resolvedBlocks.mapNames['info'];
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    isReadonly() {
      return this.assetBlockEditor.getIsReadonly();
    },
    isDirty() {
      return this.assetBlockEditor.getHasChanges();
    },
  },
  watch: {
    isDirty() {
      this.$emit('update:is-dirty', this.isDirty);
    },
  },
  mounted() {
    this.$emit('update:is-dirty', this.isDirty);
  },
});
</script>
<style lang="scss" scoped></style>
