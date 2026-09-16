<template>
  <div class="PropBlockChangeSettings">
    <div class="PropBlockChangeSettings-close" @click="$emit('save')">
      <i class="ri-close-line"></i>
    </div>
    <div class="PropBlockChangeSettings-header">
      <div
        class="PropBlockChangeSettings-header-title"
        :title="canRename ? $t('gddPage.dblClickToRename') : ''"
      >
        <renamable-text
          :value="title"
          :disabled="!canRename"
          @change="$emit('renameProp', $event)"
        >
          <caption-string :value="title" />
        </renamable-text>
      </div>
      <div
        class="PropBlockChangeSettings-header-key"
        :title="key"
        @dblclick="$emit('changeServiceName')"
      >
        <i
          class="ri-price-tag-3-fill PropBlockChangeSettings-header-key-icon"
        ></i>
        <caption-string :value="key" />
      </div>
    </div>
    <div class="PropBlockChangeSettings-section">
      <div class="PropBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldType') }}
      </div>
      <div class="PropBlockChangeSettings-section-content">
        <attribute-type-prop-editor
          :model-value="type"
          :nullable="false"
          @update:model-value="setFieldParam('type', $event)"
        ></attribute-type-prop-editor>
      </div>
    </div>
    <div class="PropBlockChangeSettings-section">
      <div class="PropBlockChangeSettings-section-content">
        <checkbox-prop-editor
          :model-value="multiple"
          :caption="$t('assetEditor.propsBlockFieldIsMultiple')"
          @update:model-value="setFieldParam('multiple', $event)"
        ></checkbox-prop-editor>
      </div>
    </div>
    <div
      v-if="paramsStructForm && paramsStructForm.fields.length > 0"
      class="PropBlockChangeSettings-section"
    >
      <div class="PropBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldParameters') }}
      </div>
      <div class="PropBlockChangeSettings-section-content">
        <props-block-sheet
          ref="sheet"
          :edit-mode="true"
          :form-def="paramsStructForm"
          :form-state="formState"
          @change-props="changeProps($event)"
        ></props-block-sheet>
      </div>
    </div>
    <div class="PropBlockChangeSettings-section">
      <div class="PropBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldHint') }}
      </div>
      <div class="PropBlockChangeSettings-section-content">
        <string-prop-editor
          :model-value="hint"
          @update:model-value="setFieldParam('hint', $event)"
        ></string-prop-editor>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, defineAsyncComponent } from 'vue';
import {
  type AssetPropValue,
  castAssetPropValueToString,
  type AssetProps,
  makeBlockRef,
} from '#logic/types/Props';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import AttributeTypePropEditor from '#components/Props/AttributeTypePropEditor.vue';
import CheckboxPropEditor from '#components/Props/CheckboxPropEditor.vue';
import StringPropEditor from '#components/Props/StringPropEditor.vue';
import type { FieldTypeController } from '#logic/types/FieldTypeController';
import CaptionString from '#components/Common/CaptionString.vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import EditorManager from '#logic/managers/EditorManager';
import RenamableText from '#components/Common/RenamableText.vue';

export default defineComponent({
  name: 'AssetEditorPropBlockChangeSettings',
  components: {
    AttributeTypePropEditor,
    CheckboxPropEditor,
    CaptionString,
    PropsBlockSheet: defineAsyncComponent(
      () => import('../PropsBlock/PropsBlockSheet.vue') as any,
    ),
    StringPropEditor,
    RenamableText,
  },
  props: {
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
  },
  emits: ['save', 'renameProp', 'changeServiceName'],
  computed: {
    canRename(): boolean {
      return true;
    },
    title(): string {
      return (
        this.resolvedBlock.title ??
        this.resolvedBlock.name ??
        this.$t('assetEditor.propsBlockFieldUntitled')
      );
    },
    key(): string {
      return this.resolvedBlock.name ?? this.resolvedBlock.title ?? '';
    },
    type(): string | null {
      const val = this.formState.values['__type']
        ? this.formState.values['__type'].value
        : null;
      return val ? castAssetPropValueToString(val) : null;
    },
    hint(): string {
      const val = this.formState.values['__hint']
        ? this.formState.values['__hint'].value
        : null;
      return val ? castAssetPropValueToString(val) : '';
    },
    multiple() {
      const val = this.formState.values['__multiple']
        ? this.formState.values['__multiple'].value
        : null;
      return val ? val : false;
    },
    typeController(): FieldTypeController | null {
      if (!this.type) return null;
      return (
        this.$getAppManager().get(EditorManager).getFieldTypesMap()[
          this.type
        ] ?? null
      );
    },
    paramsStructForm(): PropsFormDef | null {
      if (!this.typeController) return null;

      const form_fields: PropsFormFieldDef[] = [];
      for (const parameter of this.typeController.parameters) {
        form_fields.push({
          differentDefinition: false,
          index: form_fields.length,
          multiple: parameter.multiple,
          params: parameter.params,
          propTitle: parameter.title,
          type: parameter.type,
          propKey: `__params\\${parameter.name}`,
          hint: parameter.hint,
        });
      }

      return {
        differentFieldsNum: 0,
        fields: form_fields,
      };
    },
  },
  methods: {
    setFieldParam(param: string, value: AssetPropValue) {
      const key = `__${param}`;
      const block_ref = makeBlockRef(this.resolvedBlock);
      if (param === 'type' && !value) {
        if (this.resolvedBlock.inherited?.hasOwnProperty('__type')) {
          this.assetChanger.setBlockPropKey(
            this.resolvedBlock.assetId,
            block_ref,
            null,
            key,
            null,
          );
        } else {
          this.assetChanger.deleteBlockPropKey(
            this.resolvedBlock.assetId,
            block_ref,
            null,
            key,
          );
        }
        return;
      }
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        block_ref,
        null,
        key,
        value,
      );
    },
    changeProps(changes: AssetProps[]) {
      this.assetChanger.registerBlockPropsChanges(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        changes,
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

$padding-top: 85px;
$padding-aside: 20px;

.PropBlockChangeSettings {
  position: relative;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
    padding: $padding-top $padding-aside $padding-aside !important;
  }
}

.PropBlockChangeSettings-header {
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.PropBlockChangeSettings-header-title {
  flex: 1;
  display: flex;
  margin-left: 5px;
}

.PropBlockChangeSettings-header-key {
  color: var(--local-sub-text-color);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.PropBlockChangeSettings-header-key-icon {
  margin-right: 3px;
}

.PropBlockChangeSettings-section {
  margin-bottom: 20px;
}

.PropBlockChangeSettings-section-header {
  margin-bottom: 10px;
}

.PropBlockChangeSettings-close {
  position: absolute;
  right: $padding-aside;
  top: $padding-top - 40px;
  font-size: 25px;

  @include devices-mixins.device-type(pc) {
    display: none;
  }
}

.PropBlockChangeSettings-section-content :deep(.StringPropEditor) {
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
