<template>
  <div class="EditorBlockContent">
    <async-component
      :is="blockTypeDefinition.component"
      v-if="blockTypeDefinition && blockController"
    >
      <template #default="{ component }">
        <component
          :is="
            blockTypeDefinition.resizableBlockHeight && displayMode !== 'page'
              ? 'asset-block-resizer'
              : 'div'
          "
          v-model:content-height="blockHeight"
        >
          <component
            :is="component"
            ref="comp"
            class="EditorBlockContent-component"
            v-bind="blockProps ? blockProps : {}"
            :asset-block-editor="assetBlockEditor"
            :readonly="isReadOnly"
            :rights="resolvedBlock.rights"
            :asset-changer="assetBlockEditor.assetChanger"
            :display-mode="displayMode"
            :editor-block-handler="editorBlockHandler"
            :block-controller="blockController"
            :resolved-block="resolvedBlock"
            :request-toolbar-target="requestToolbarTarget"
            @save="$emit('save', $event)"
            @view-ready="$emit('view-ready', $event)"
            @send-message="$emit('sendMessage')"
            @vue:mounted="blockCompMounted"
            @vue:unmounted="blockCompUnmounted"
          >
            <template
              v-for="slotName of Object.keys($slots)"
              :key="slotName"
              #[slotName]="slotData"
              ><slot :name="slotName"
v-bind="slotData"
            /></template>
          </component>
        </component>
      </template>
    </async-component>
    <div
      v-else-if="!blockTypeDefinition"
      class="EditorBlockContent-undefinedType"
    >
      {{
        $t('assetEditor.unregisteredBlockType', {
          type: resolvedBlock.type,
        })
      }}
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  getPreferenceKeyForBlock,
  type AssetDisplayMode,
  type ResolvedAssetBlock,
} from '../../../logic/utils/assets';
import type { AssetBlockEditorVM } from '../../../logic/vm/AssetBlockEditorVM';
import type { EditorBlockHandler } from './EditorBlock';
import { MIN_ASSET_RIGHTS_TO_CHANGE } from '../../../logic/types/Rights';
import AsyncComponent from '../../Common/AsyncComponent.vue';
import AssetBlockResizer from './AssetBlockResizer.vue';
import UiPreferenceManager from '../../../logic/managers/UiPreferenceManager';
import { capitalizeFirstLetter } from '../../../logic/utils/stringUtils';
import EditorManager from '../../../logic/managers/EditorManager';
import type { IAssetBlockComponent } from '../../../logic/types/IAssetBlockComponent';

export default defineComponent({
  name: 'EditorBlockContent',
  components: {
    AsyncComponent,
    AssetBlockResizer,
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    blockProps: {
      type: Object as PropType<any>,
      default: null,
    },
    editorBlockHandler: {
      type: Object as PropType<EditorBlockHandler>,
      required: true,
    },
    requestToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      required: true,
    },
  },
  emits: ['view-ready', 'sendMessage', 'show-chat', 'save'],
  computed: {
    injectedBlockSlots() {
      return Object.keys(this.$slots)
        .filter((slotName) => slotName.startsWith('block-'))
        .map((slotName) => {
          return {
            originalSlot: slotName,
            blockSlot: slotName.substring('block-'.length),
          };
        });
    },
    blockName() {
      if (!this.blockTypeDefinition) return;
      return this.blockTypeDefinition.name;
    },
    preferenceId() {
      return getPreferenceKeyForBlock(this.resolvedBlock);
    },
    blockHeight: {
      get(): number {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference(
            `${capitalizeFirstLetter(this.blockName ?? '')}Block.contentHeight.` +
              this.preferenceId,
            400,
          );
      },
      set(val: number) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference(
            `${capitalizeFirstLetter(this.blockName ?? '')}Block.contentHeight.` +
              this.preferenceId,
            val,
          );
      },
    },
    isReadOnly() {
      return (
        this.resolvedBlock.rights < MIN_ASSET_RIGHTS_TO_CHANGE || this.readonly
      );
    },
    blockTypeDefinition() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypeDefinition(this.resolvedBlock.type);
    },
    blockController() {
      const editor_context = this.assetBlockEditor.editorContextForAssetRequest
        ? this.assetBlockEditor.editorContextForAssetRequest.get()
        : null;
      if (!editor_context) return null;
      return editor_context.getBlockController(this.resolvedBlock.id);
    },
  },
  methods: {
    async _awaitCompMount(timeout: number): Promise<any | null> {
      for (let i = 0; i < timeout / 10; i++) {
        if (this.$refs['comp']) {
          return this.$refs['comp'];
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return null;
    },
    async enterEditMode() {
      const comp = await this._awaitCompMount(1000);
      if (!comp) return false;
      if (!comp.enterEditMode) return false;
      comp.enterEditMode();
      return true;
    },
    async revealBlockAnchor(anchor: string) {
      const comp = await this._awaitCompMount(1000);
      if (!comp) return false;
      if (!comp.revealBlockAnchor) return false;
      return await comp.revealBlockAnchor(anchor);
    },
    blockCompMounted() {
      this.assetBlockEditor.setBlockMounted(
        this.resolvedBlock.id,
        this.$refs['comp'] as IAssetBlockComponent,
      );
    },
    blockCompUnmounted() {
      this.assetBlockEditor.setBlockUnmounted(this.resolvedBlock.id);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.EditorBlockContent-component {
  height: 100%;
}

.EditorBlockContent-undefinedType {
  color: var(--color-main-error);
}
</style>
