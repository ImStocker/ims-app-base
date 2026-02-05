<template>
  <div class="AssetEditorEmbedBlock" :class="{ 'state-edit': editMode }">
    <div
      v-if="!current.same"
      class="AssetEditorEmbedBlock-messages AssetEditorEmbedBlock-inner"
    >
      {{ $t('assetEditor.differentValues') }}
    </div>
    <a
      v-if="kind.iframeLink && displayMode === 'print'"
      class="LinkListBlockItem-link"
      :href="kind.iframeLink"
      target="_blank"
    >
      {{ kind.iframeLink }}
    </a>
    <div v-else-if="kind.iframeLink">
      <asset-block-resizer v-model:content-height="contentHeight">
        <iframe
          class="AssetEditorEmbedBlock-iframe"
          :src="kind.iframeLink"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </asset-block-resizer>
    </div>
    <div v-else class="AssetEditorEmbedBlock-inner">
      <i class="AssetEditorEmbedBlock-external-icon ri-link"></i>
      <a :href="current.value" target="_blank">{{ current.value }}</a>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import UiPreferenceManager from '#logic/managers/UiPreferenceManager';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import {
  sameAssetPropValues,
  castAssetPropValueToString,
  isPropInherited,
  makeBlockRef,
} from '#logic/types/Props';
import DialogManager from '#logic/managers/DialogManager';
import AddEmbedDialog from './AddEmbedDialog.vue';
import AssetBlockResizer from '#components/Asset/Editor/AssetBlockResizer.vue';
import {
  getPreferenceKeyForBlock,
  type AssetDisplayMode,
  type ResolvedAssetBlock,
} from '#logic/utils/assets';
import { detectEmbedKind } from './detectEmbedKind';
import type { AssetChanger } from '#logic/types/AssetChanger';

export default defineComponent({
  name: 'EmbedBlock',
  components: { AssetBlockResizer },
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
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['save', 'discard'],
  data() {
    return {};
  },
  computed: {
    kind() {
      return detectEmbedKind(this.current.value);
    },
    preferenceId() {
      return getPreferenceKeyForBlock(this.resolvedBlock);
    },
    contentHeight: {
      get(): number {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference(
            'DiagramBlock.contentHeight.' + this.preferenceId,
            500,
          );
      },
      set(val: number) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference(
            'DiagramBlock.contentHeight.' + this.preferenceId,
            val,
          );
      },
    },
    current(): {
      value: string;
      same: boolean;
      inherited: boolean;
    } {
      const value = castAssetPropValueToString(
        this.resolvedBlock.computed['value'],
      );
      const prop_inherited = this.resolvedBlock.inherited
        ? isPropInherited(
            'value',
            this.resolvedBlock.props,
            this.resolvedBlock.inherited,
          )
        : false;
      const inherited =
        prop_inherited && this.resolvedBlock.props['value'] === undefined;
      const same = true;
      return {
        value,
        same,
        inherited,
      };
    },
    editMode() {
      return this.assetBlockEditor.isBlockEditing(this.resolvedBlock.id);
    },
  },
  methods: {
    async enterEditMode(ev?: MouseEvent, _useMouseCoord: boolean = false) {
      if (this.readonly) return;
      if (this.editMode) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      const res = await this.$getAppManager()
        .get(DialogManager)
        .show(AddEmbedDialog, {
          link: this.current.value,
          title: '',
        });
      if (res) {
        this.emitValue(res.link);
        this.save();
      }
    },
    emitValue(text: any) {
      if (!sameAssetPropValues(this.current.value, text)) {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          'value',
          text,
        );
      }
    },
    save() {
      this.$emit('save');
      this.assetBlockEditor.exitEditMode();
    },
    onFocus() {},
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorEmbedBlock-inner {
  background-color: var(--local-bg-color);
  padding: 15px 20px;
  border-radius: 4px;
  box-sizing: border-box;
  border: 1px solid var(--local-bg-color);
}

.AssetEditorEmbedBlock-messages {
  font-style: italic;
  color: #999;
}

.AssetEditorEmbedBlock-iframe {
  width: 100%;
  height: 100%;
}

.AssetEditorEmbedBlock-external-icon {
  margin-right: 10px;
  color: var(--local-sub-text-color);
}
</style>
