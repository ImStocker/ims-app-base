<template>
  <div class="AssetBlockEditorRoot">
    <slot :asset-block-editor="assetBlockEditor"></slot>
    <asset-editor-toolbar-widget
      v-if="!isReadonly && isActiveEditor"
      class="AssetBlockEditor-toolbar"
      :toolbar-vm="assetBlockEditor"
      :hide-actions="toolbarHideActions"
    ></asset-editor-toolbar-widget>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type { AssetFullInstanceR } from '../../../logic/types/AssetFullInstance';
import { AssetRights } from '../../../logic/types/Rights';
import AssetEditorToolbarWidget from '../Editor/AssetEditorToolbarWidget.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import { useAppManager } from '../../../composables/useAppManager';

export default defineComponent({
  name: 'AssetBlockEditorRoot',
  components: {
    AssetEditorToolbarWidget,
  },
  props: {
    assetFull: {
      type: Object as PropType<AssetFullInstanceR>,
      required: true,
    },
    toolbarShowBlockCopyPaste: {
      type: Boolean,
      default: true,
    },
  },
  async setup(props) {
    const appManager = useAppManager();
    const assetBlockEditor = AssetBlockEditorVM.CreateInstance(
      appManager,
      props.assetFull,
    );
    await assetBlockEditor.init();
    return {
      assetBlockEditor,
      globalKeydownHandler: null as ((e: KeyboardEvent) => void) | null,
    };
  },
  computed: {
    isReadonly() {
      return this.assetFull.rights <= AssetRights.READ_ONLY;
    },
    isActiveEditor() {
      return (
        this.$getAppManager().get(EditorManager).activeEditor ===
        this.assetBlockEditor
      );
    },
    toolbarHideActions() {
      return this.toolbarShowBlockCopyPaste
        ? []
        : ['blockCopy', 'blockPaste', 'blockCopyAsMirror'];
    },
  },
  watch: {
    async assetFull() {
      if (this.assetBlockEditor) this.assetBlockEditor.destroy();
      this.assetBlockEditor = AssetBlockEditorVM.CreateInstance(
        this.$getAppManager(),
        this.assetFull,
      );
      await this.assetBlockEditor.init();
    },
  },
  async mounted() {
    this.assetBlockEditor.initClient();
    this._resetGlobalKeydownEvent(true);
  },
  unmounted() {
    this.assetBlockEditor.destroy();
    this._resetGlobalKeydownEvent(false);
  },
  methods: {
    _resetGlobalKeydownEvent(init: boolean) {
      if (this.globalKeydownHandler) {
        window.removeEventListener('keydown', this.globalKeydownHandler);
        this.globalKeydownHandler = null;
      }
      if (init) {
        this.globalKeydownHandler = (ev) => {
          if (this.isActiveEditor) {
            if (ev.code === 'KeyS' && (ev.ctrlKey || ev.metaKey)) {
              this.assetBlockEditor.saveChanges();
            }
          }
        };
        window.addEventListener('keydown', this.globalKeydownHandler);
      }
    },
    async saveChanges() {
      await this.assetBlockEditor.saveChanges();
    },
  },
});
</script>
