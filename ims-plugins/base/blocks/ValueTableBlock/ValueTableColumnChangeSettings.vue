<template>
  <div class="ValueTableColumnChangeSettings">
    <div class="ValueTableColumnChangeSettings-close" @click="$emit('save')">
      <i class="ri-close-line"></i>
    </div>
    <div
      class="ValueTableColumnChangeSettings-header use-buttons-icon-outlined"
    >
      <button
        class="is-button"
        :disabled="propsCount < 2"
        @click="$emit('switchSettingsProp', -1)"
      >
        <i class="ri-arrow-left-s-line"></i>
      </button>
      <div
        class="ValueTableColumnChangeSettings-header-title"
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
        class="ValueTableColumnChangeSettings-header-key"
        :title="propKey"
        @dblclick="setServiceName()"
      >
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
    <div class="ValueTableColumnChangeSettings-section">
      <div class="ValueTableColumnChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldType') }}
      </div>
      <div class="ValueTableColumnChangeSettings-section-content">
        <attribute-type-prop-editor
          :model-value="type"
          :nullable="false"
          @update:model-value="setFieldParam('type', $event)"
        ></attribute-type-prop-editor>
      </div>
    </div>
    <div class="ValueTableColumnChangeSettings-section">
      <div class="ValueTableColumnChangeSettings-section-content">
        <checkbox-prop-editor
          :model-value="multiple"
          :caption="$t('assetEditor.propsBlockFieldIsMultiple')"
          @update:model-value="setFieldParam('multiple', $event)"
        ></checkbox-prop-editor>
      </div>
    </div>
    <div
      v-if="paramsStructForm && paramsStructForm.fields.length > 0"
      class="ValueTableColumnChangeSettings-section"
    >
      <div class="ValueTableColumnChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldParameters') }}
      </div>
      <div class="ValueTableColumnChangeSettings-section-content">
        <props-block-sheet
          ref="sheet"
          :edit-mode="true"
          :form-def="paramsStructForm"
          :form-state="formState"
          @change-props="changeProps($event)"
        ></props-block-sheet>
      </div>
    </div>
    <div class="ValueTableColumnChangeSettings-section">
      <div class="ValueTableColumnChangeSettings-section-header">
        {{ $t('assetEditor.propsBlockFieldOrder') }}
      </div>
      <div class="ValueTableColumnChangeSettings-section-content">
        <button
          class="ValueTableColumnChangeSettings-section-content-button is-button"
          @click="moveField(-1)"
        >
          {{ $t('assetEditor.valueTableColumnOrderLeft') }}
        </button>
        <button
          class="ValueTableColumnChangeSettings-section-content-button is-button"
          @click="moveField(+1)"
        >
          {{ $t('assetEditor.valueTableColumnOrderRight') }}
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
import type { AssetChanger } from '#logic/types/AssetChanger';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import EditorManager from '#logic/managers/EditorManager';
import UiManager from '#logic/managers/UiManager';
import RenamableText from '#components/Common/RenamableText.vue';

export default defineComponent({
  name: 'AssetEditorValueTableColumnChangeSettings',
  components: {
    AttributeTypePropEditor,
    CheckboxPropEditor,
    CaptionString,
    PropsBlockSheet: defineAsyncComponent(
      () => import('../PropsBlock/PropsBlockSheet.vue') as any,
    ),
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
    return {
      isRenaming: false,
    };
  },
  computed: {
    canRename() {
      return true;
    },
    title: {
      get() {
        const key = `__columns\\${this.propKey}\\title`;
        const val = this.formState.values[key]
          ? this.formState.values[key].value
          : null;
        return val
          ? castAssetPropValueToString(val)
          : this.$t('assetEditor.propsBlockFieldUntitled');
      },
      set(value: string) {
        this.setFieldParam('title', value);
      },
    },
    type() {
      const key = `__columns\\${this.propKey}\\type`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val ? castAssetPropValueToString(val) : 'text';
    },
    multiple() {
      const key = `__columns\\${this.propKey}\\multiple`;
      const val = this.formState.values[key]
        ? this.formState.values[key].value
        : null;
      return val ? val : false;
    },
    addtionalParamsJson() {
      const key = `__columns\\${this.propKey}\\params`;
      const obj = extractAssetPropsSubObject(this.formState.combined, key);
      return JSON.stringify(obj, null, 2);
    },
    typeController(): FieldTypeController | null {
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
          propKey: `__columns\\${this.propKey}\\params\\${parameter.name}`,
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
    async setFieldParam(param: string, value: AssetPropValue) {
      await this.$getAppManager().get(UiManager).blurActiveElement();
      const key = `__columns\\${this.propKey}\\${param}`;
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        key,
        value,
      );
    },
    async moveField(offset: number) {
      await this.$getAppManager().get(UiManager).blurActiveElement();
      const current_index_key = `__columns\\${this.propKey}\\index`;
      const current_index =
        castAssetPropValueToFloat(
          this.formState.values[current_index_key]?.value,
        ) ?? 0;
      const key_indices: { key: string; index: number; di: number }[] = [];
      for (const [key, val] of Object.entries(this.formState.values)) {
        if (/^__columns\\.*?\\index$/.test(key)) {
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

.ValueTableColumnChangeSettings {
  position: relative;

  @include devices-mixins.device-type(not-pc) {
    width: 100% !important;
    padding: $padding-top $padding-aside $padding-aside !important;
  }
}

.ValueTableColumnChangeSettings-header {
  font-weight: bold;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.ValueTableColumnChangeSettings-header-title {
  flex: 1;
}

.ValueTableColumnChangeSettings-header-key {
  color: var(--local-sub-text-color);
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ValueTableColumnChangeSettings-section {
  margin-bottom: 20px;
}

.ValueTableColumnChangeSettings-section-header {
  margin-bottom: 10px;
}

.ValueTableColumnChangeSettings-section-content-button:not(:last-child) {
  margin-right: 10px;
}

.ValueTableColumnChangeSettings-close {
  position: absolute;
  right: $padding-aside;
  top: $padding-top - 40px;
  font-size: 25px;

  @include devices-mixins.device-type(pc) {
    display: none;
  }
}

.ValueTableColumnChangeSettings-section-content :deep(.StringPropEditor) {
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
