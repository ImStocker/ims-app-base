<template>
  <div>
    <div class="AssetEditorBlockMirrorBlock">
      <teleport
        v-if="assetBlockEditor.projectInfo && asset && toolbarTarget"
        :to="toolbarTarget"
      >
        <div class="AssetEditorBlockMirrorBlock-toolbar is-box">
          {{ $t('assetEditor.blockMirrorFrom') }}:
          <asset-link
            :open-popup="true"
            :project="assetBlockEditor.projectInfo"
            :asset="{ id: asset.AssetId, name: asset.Name, title: asset.Title }"
          ></asset-link>
        </div>
      </teleport>
      <div
        v-if="isLoading"
        class="AssetEditorBlockMirrorBlock-loading loaderSpinner"
      ></div>
      <div
        v-else-if="errorComp"
        class="AssetEditorBlockMirrorBlock-error error-message-block"
      >
        {{ errorComp }}
      </div>
      <asset-block-viewer-root
        v-else-if="targetResolvedBlock && targetAssetFull"
        :asset-full="targetAssetFull"
      >
        <template #default="{ assetBlockEditor: targetAssetBlockEditor }">
          <editor-block-content
            :asset-block-editor="targetAssetBlockEditor"
            :readonly="true"
            :rights="readonlyRights"
            :asset-changer="targetAssetBlockEditor.assetChanger"
            :display-mode="displayMode"
            :editor-block-handler="editorBlockHandler"
            :resolved-block="targetResolvedBlock"
            :request-toolbar-target="innerRequestToolbarTarget"
            @view-ready="$emit('view-ready', $event)"
          ></editor-block-content>
        </template>
      </asset-block-viewer-root>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineAsyncComponent, defineComponent } from 'vue';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import AssetLink from '#components/Asset/AssetLink.vue';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import {
  castAssetPropValueToString,
  parseAssetNewBlockRef,
  type AssetPropValueAsset,
} from '#logic/types/Props';
import {
  calcResolvedBlocks,
  type AssetFullInstanceR,
} from '#logic/types/AssetFullInstance';
import { AssetRights } from '#logic/types/Rights';
import type { EditorBlockHandler } from '#components/Asset/Editor/EditorBlock';
import DialogManager from '#logic/managers/DialogManager';
import AssetPreviewDialog from '#components/Asset/AssetPreviewDialog.vue';

export default defineComponent({
  name: 'BlockMirrorBlock',
  components: {
    AssetLink,
    EditorBlockContent: defineAsyncComponent(
      () => import('#components/Asset/Editor/EditorBlockContent.vue'),
    ),
    AssetBlockViewerRoot: defineAsyncComponent(
      () => import('#components/Asset/Editor/AssetBlockViewerRoot.vue'),
    ),
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
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    requestToolbarTarget: {
      type: Function as PropType<() => Promise<HTMLElement | null>>,
      required: true,
    },
    editorBlockHandler: {
      type: Object as PropType<EditorBlockHandler>,
      required: true,
    },
  },
  emits: ['save', 'discard', 'view-ready'],
  data() {
    return {
      isLoading: true,
      loadingError: null as null | string,
      toolbarTarget: null as null | HTMLElement,
      targetAssetFull: null as null | AssetFullInstanceR,
    };
  },
  computed: {
    readonlyRights() {
      return AssetRights.READ_ONLY;
    },
    asset(): AssetPropValueAsset | null {
      const asset = this.resolvedBlock.computed['asset'];
      if (!asset || !(asset as AssetPropValueAsset).AssetId) return null;
      return asset as AssetPropValueAsset;
    },
    blockRef() {
      return castAssetPropValueToString(
        this.resolvedBlock.computed['block_ref'],
      );
    },
    parsedBlockRef() {
      try {
        return {
          error: null,
          value: parseAssetNewBlockRef(this.blockRef),
        };
      } catch (err: any) {
        return {
          error: err.message,
          value: null,
        };
      }
    },
    targetResolvedBlock() {
      const block_ref_parsed = this.parsedBlockRef;
      if (!block_ref_parsed.value || !this.targetAssetFull) {
        return null;
      }
      const resolvedBlocks = calcResolvedBlocks(this.targetAssetFull);
      return (
        resolvedBlocks.list.find((block) => {
          if (block_ref_parsed.value.blockName) {
            return block.name === block_ref_parsed.value.blockName;
          }
          if (block_ref_parsed.value.blockId) {
            return block.id === block_ref_parsed.value.blockId;
          }

          return false;
        }) ?? null
      );
    },
    errorComp() {
      if (this.loadingError) return this.loadingError;
      else if (this.parsedBlockRef.error) return this.parsedBlockRef.error;
      else if (!this.targetResolvedBlock) {
        return this.$t('assetEditor.blockMirrorTargetBlockNotFound');
      } else return null;
    },
  },
  async mounted() {
    this.toolbarTarget = await this.requestToolbarTarget();
    await this.loadBlock();
  },
  methods: {
    async enterEditMode() {
      if (!this.asset) return;
      await this.$getAppManager().get(DialogManager).show(AssetPreviewDialog, {
        assetId: this.asset.AssetId,
      });
    },
    async innerRequestToolbarTarget() {
      return null;
    },
    async loadBlock() {
      try {
        this.isLoading = true;
        if (!this.asset) {
          throw new Error(
            this.$t('assetEditor.blockMirrorTargetElementNotBound'),
          );
        }
        this.targetAssetFull = await this.assetBlockEditor.getAssetInstance(
          this.asset.AssetId,
        );
        if (!this.targetAssetFull) {
          throw new Error(
            this.$t('assetEditor.blockMirrorTargetElementNotFound'),
          );
        }
        this.targetAssetFull.activate();
      } catch (err: any) {
        this.loadingError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorBlockMirrorBlock-toolbar {
  border-radius: 4px;
  padding: 0px 10px;

  & > a {
    text-decoration: none;
  }
}
</style>
