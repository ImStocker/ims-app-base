<template>
  <div>
    <div class="AssetEditorTextBlock">
      <imc-editor
        v-if="editMode"
        ref="editor"
        class="AssetEditorTextBlock-editor AssetEditorTextBlock-inner"
        :model-value="current.value"
        :multiline="true"
        data-ims-block-key="value"
        @blur="save()"
        @focus="onFocus()"
        @update:model-value="emitValue($event)"
        @view-ready="$emit('view-ready', $event)"
      ></imc-editor>
      <div
        v-else-if="!current.same"
        class="AssetEditorTextBlock-messages AssetEditorTextBlock-inner"
        :title="$t('assetEditor.textBlockChangeText')"
        @click="enterEditMode($event, false)"
      >
        {{ $t('assetEditor.differentValues') }}
      </div>
      <div
        v-else-if="!current.value"
        class="AssetEditorTextBlock-messages AssetEditorTextBlock-inner"
        :title="readonly ? '' : $t('assetEditor.textBlockChangeText')"
        @click="enterEditMode($event, false)"
      >
        {{ $t('assetEditor.textBlockNoText') }}
      </div>
      <imc-presenter
        v-else
        class="AssetEditorTextBlock-presenter AssetEditorTextBlock-inner"
        :class="{
          'state-inherited': displayMode === 'normal' && current.inherited,
        }"
        :title="readonly ? '' : $t('assetEditor.textBlockChangeText')"
        :value="current.value"
        :get-header-anchor="getHeaderAnchor"
        @click="enterEditMode($event, true)"
        @view-ready="$emit('view-ready', $event)"
      ></imc-presenter>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  extractHeaderAnchorsFromText,
  makeAnchorTagId,
  type AssetDisplayMode,
  type ResolvedAssetBlock,
} from '#logic/utils/assets';
import ImcEditor from '#components/ImcText/ImcEditor.vue';
import ImcPresenter from '#components/ImcText/ImcPresenter.vue';
import {
  AssetPropType,
  type AssetPropValue,
  type AssetPropValueText,
  getAssetPropType,
  isPropInherited,
  makeBlockRef,
  sameAssetPropValues,
} from '#logic/types/Props';
import { isElementInteractive } from '#components/utils/DomElementUtils';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { AssetChanger } from '#logic/types/AssetChanger';

export default defineComponent({
  name: 'TextBlock',
  components: { ImcPresenter, ImcEditor },
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
  emits: ['save', 'discard', 'view-ready'],
  computed: {
    current(): {
      value: AssetPropValue;
      same: boolean;
      inherited: boolean;
    } {
      const value = this.resolvedBlock.computed['value'];
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
    generatedBlockAnchors() {
      const value = this.resolvedBlock.computed['value'];
      if (getAssetPropType(value) === AssetPropType.TEXT) {
        return extractHeaderAnchorsFromText(value as AssetPropValueText);
      }
      return [];
    },
  },
  methods: {
    getHeaderAnchor(
      _title: string,
      _level: number,
      index: number,
    ): string | null {
      if (index < this.generatedBlockAnchors.length) {
        return makeAnchorTagId(
          this.resolvedBlock.id,
          this.generatedBlockAnchors[index].anchor,
        );
      }
      return null;
    },
    async enterEditMode(ev?: MouseEvent, useMouseCoord: boolean = false) {
      if (this.readonly) return;
      if (ev && isElementInteractive(ev.target as HTMLElement)) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);

      await new Promise((resolve) => setTimeout(resolve, 1));
      if (this.$refs.editor) {
        if (ev && useMouseCoord) {
          const coord_x = ev.clientX;
          const coord_y = ev.clientY;
          await (this.$refs.editor as any).focusAt(coord_x, coord_y);
        } else {
          await (this.$refs.editor as any).focus();
        }
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
.AssetEditorTextBlock {
  line-height: var(--local-line-height-text);
}
.AssetEditorTextBlock.state-edit {
  .AssetEditorTextBlock-inner {
    border-color: var(--color-main-yellow);
  }
}

.AssetEditorTextBlock-inner {
  background-color: var(--local-bg-color);
  // padding: 15px 20px;
  border-radius: 4px;
  box-sizing: border-box;
  border: 1px solid var(--local-bg-color);
}

.AssetEditorTextBlock-messages {
  font-style: italic;
  color: #999;
}

.AssetEditorTextBlock-presenter {
  &.state-inherited {
    color: var(--color-inherited-value);
  }
}
</style>
