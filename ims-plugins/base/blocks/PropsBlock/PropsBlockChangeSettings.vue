<template>
  <div class="PropsBlockChangeSettings">
    <div class="PropsBlockChangeSettings-close" @click="$emit('save')">
      <i class="ri-close-line"></i>
    </div>
    <div class="PropsBlockChangeSettings-header use-buttons-icon-outlined">
      <button
        class="is-button"
        :disabled="propsCount < 2"
        @click="$emit('switchSettingsProp', -1)"
      >
        <i class="ri-arrow-left-s-line"></i>
      </button>
      <div
        class="PropsBlockChangeSettings-header-title"
        :title="canRename ? $t('gddPage.dblClickToRename') : ''"
      >
        <renamable-text
          :value="title"
          :disabled="!canRename"
          @change="renameProp($event)"
        >
          <caption-string :value="title" />
        </renamable-text>
      </div>
      <div
        class="PropsBlockChangeSettings-header-key"
        :title="propKey"
        @dblclick="setServiceName()"
      >
        <i
          class="ri-price-tag-3-fill PropsBlockChangeSettings-header-key-icon"
        ></i>
        <caption-string :value="propKey" />
      </div>
      <button
        class="is-button"
        :disabled="propsCount < 2"
        @click="$emit('switchSettingsProp', 1)"
      >
        <i class="ri-arrow-right-s-line"></i>
      </button>
    </div>
    <div class="PropsBlockChangeSettings-section">
      <div class="PropsBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldType') }}
      </div>
      <div class="PropsBlockChangeSettings-section-content">
        <attribute-type-prop-editor
          :model-value="type"
          :nullable="false"
          @update:model-value="setFieldParam('type', $event)"
        ></attribute-type-prop-editor>
      </div>
    </div>
    <div class="PropsBlockChangeSettings-section">
      <div class="PropsBlockChangeSettings-section-content">
        <checkbox-prop-editor
          :model-value="multiple"
          :caption="$t('assetEditor.propsBlockFieldIsMultiple')"
          @update:model-value="setFieldParam('multiple', $event)"
        ></checkbox-prop-editor>
      </div>
    </div>
    <div
      v-if="paramsStructForm && paramsStructForm.fields.length > 0"
      class="PropsBlockChangeSettings-section"
    >
      <div class="PropsBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldParameters') }}
      </div>
      <div class="PropsBlockChangeSettings-section-content">
        <props-block-sheet
          ref="sheet"
          :edit-mode="true"
          :form-def="paramsStructForm"
          :form-state="formState"
          @change-props="changeProps($event)"
        ></props-block-sheet>
      </div>
    </div>
    <div class="PropsBlockChangeSettings-section">
      <div class="PropsBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldHint') }}
      </div>
      <div class="PropsBlockChangeSettings-section-content">
        <string-prop-editor
          :model-value="hint"
          @update:model-value="setFieldParam('hint', $event)"
        ></string-prop-editor>
      </div>
    </div>
    <div class="PropsBlockChangeSettings-section">
      <div class="PropsBlockChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldOrder') }}
      </div>
      <div class="PropsBlockChangeSettings-section-content">
        <button
          class="PropsBlockChangeSettings-section-content-button is-button"
          @click="moveField(-1)"
        >
          {{ $t('assetEditor.propsBlockFieldOrderUp') }}
        </button>
        <button
          class="PropsBlockChangeSettings-section-content-button is-button"
          @click="moveField(+1)"
        >
          {{ $t('assetEditor.propsBlockFieldOrderDown') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent, defineAsyncComponent } from 'vue';
import {
  type AssetPropValue,
  castAssetPropValueToString,
  extractAssetPropsSubObject,
  castAssetPropValueToFloat,
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
import type { FieldTypeController } from '#logic/types/FieldTypeController';
import CaptionString from '#components/Common/CaptionString.vue';
import StringPropEditor from '#components/Props/StringPropEditor.vue';
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import EditorManager from '#logic/managers/EditorManager';
import RenamableText from '#components/Common/RenamableText.vue';

export default defineComponent({
  name: 'AssetEditorPropsBlockChangeSettings',
  components: {
    AttributeTypePropEditor,
    CheckboxPropEditor,
    CaptionString,
    PropsBlockSheet: defineAsyncComponent(
      () => import('./PropsBlockSheet.vue') as any,
    ),
    StringPropEditor,
    RenamableText,
  },
  props: {
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    propKey: {
      type: String,
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
    propsCount: {
      type: Number,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
    'enter',
    'save',
    'switchSettingsProp',
    'changeServiceName',
    'renameProp',
  ],
  data() {
    return {};
  },
  computed: {
    canRename() {
      return true;
    },
    title() {
      const key = `__props\\${this.propKey}\\title`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val
        ? castAssetPropValueToString(val)
        : this.$t('assetEditor.propsBlockFieldUntitled');
    },
    type() {
      const key = `__props\\${this.propKey}\\type`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val ? castAssetPropValueToString(val) : null;
    },
    hint() {
      const key = `__props\\${this.propKey}\\hint`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val ? castAssetPropValueToString(val) : '';
    },
    multiple() {
      const key = `__props\\${this.propKey}\\multiple`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val ? val : false;
    },
    addtionalParamsJson() {
      const key = `__props\\${this.propKey}\\params`;
      const obj = extractAssetPropsSubObject(this.formState.combined, key);
      return JSON.stringify(obj, null, 2);
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
          propKey: `__props\\${this.propKey}\\params\\${parameter.name}`,
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
    renameProp(title: string) {
      this.$emit('renameProp', title);
    },
    setServiceName() {
      this.$emit('changeServiceName');
    },
    setFieldParam(param: string, value: AssetPropValue) {
      const key = `__props\\${this.propKey}\\${param}`;
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        key,
        value,
      );
    },
    moveField(offset: number) {
      const current_index_key = `__props\\${this.propKey}\\index`;
      const current_index =
        castAssetPropValueToFloat(
          this.formState.values[current_index_key]?.value,
        ) ?? 0;
      const key_indices: { key: string; index: number; di: number }[] = [];
      for (const [key, val] of Object.entries(this.formState.values)) {
        if (/^__props\\.*?\\index$/.test(key)) {
          const index = castAssetPropValueToFloat(val.value) ?? 0;
          let di: number;
          if (offset < 0) di = current_index - index;
          else di = index - current_index;
          if (di > 0) {
            key_indices.push({
              key,
              index: index,
              di,
            });
          }
        }
      }
      if (key_indices.length > 0) {
        key_indices.sort((a, b) => a.di - b.di);
        const op = this.assetChanger.makeOpId();
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          current_index_key,
          key_indices[0].index,
          op,
        );
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          key_indices[0].key,
          current_index,
          op,
        );
      }
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

.PropsBlockChangeSettings {
  position: relative;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
    padding: $padding-top $padding-aside $padding-aside !important;
  }
}

.PropsBlockChangeSettings-header {
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.PropsBlockChangeSettings-header-title {
  flex: 1;
  display: flex;
  margin-left: 5px;
}

.PropsBlockChangeSettings-header-title-manage {
  display: flex;
  gap: 5px;
}

.PropsBlockChangeSettings-header-key {
  color: var(--local-sub-text-color);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.PropsBlockChangeSettings-header-key-icon {
  margin-right: 3px;
}

.PropsBlockChangeSettings-section {
  margin-bottom: 20px;
}

.PropsBlockChangeSettings-section-header {
  margin-bottom: 10px;
}

.PropsBlockChangeSettings-section-content-button:not(:last-child) {
  margin-right: 10px;
}

.PropsBlockChangeSettings-close {
  position: absolute;
  right: $padding-aside;
  top: $padding-top - 40px;
  font-size: 25px;

  @include devices-mixins.device-type(pc) {
    display: none;
  }
}

.PropsBlockChangeSettings-section-content :deep(.StringPropEditor) {
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
