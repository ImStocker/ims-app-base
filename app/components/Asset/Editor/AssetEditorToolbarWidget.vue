<template>
  <div
    class="AssetEditorToolbarWidget"
    :class="{
      'state-pinned': pinned,
    }"
  >
    <asset-editor-toolbar
      v-model:pinned="pinned"
      :toolbar-vm="toolbarVm"
      :hide-actions="hideActions"
    ></asset-editor-toolbar>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import AssetEditorToolbar from './AssetEditorToolbar.vue';
import UiPreferenceManager from '../../../logic/managers/UiPreferenceManager';
import type { IAssetEditorToolbarVM } from '../../../logic/vm/IAssetEditorToolbarVM';

export default defineComponent({
  name: 'AssetEditorToolbarWidget',
  components: {
    AssetEditorToolbar,
  },
  props: {
    toolbarVm: {
      type: Object as PropType<IAssetEditorToolbarVM>,
      required: true,
    },
    hideActions: {
      type: Array<string>,
      default: () => [],
    },
  },
  computed: {
    pinned: {
      get() {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference('AssetEditorToolbarWidget_pinned', true);
      },
      set(val: boolean) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference('AssetEditorToolbarWidget_pinned', val);
      },
    },
  },
});
</script>
<style lang="scss" scoped>
.AssetEditorToolbarWidget {
  padding-top: 5px;
  position: fixed;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  transition: top 0.5s ease-in-out;
  &:hover,
  &.state-pinned {
    top: 0px;
  }
}
</style>
