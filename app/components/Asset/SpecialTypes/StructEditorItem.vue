<template>
  <some-editor-list-item
    class="StructureEditorItem"
    :item="item"
    :readonly="readonly"
  >
    <template #item-main>
      <div class="StructureEditorItem-main">
        <renamable-text
          v-model:is-renaming-mode-state="isMainEditMode"
          class="StructureEditorItem-main-renamable"
          :disabled="readonly"
        >
          <caption-string
            :value="item.propTitle"
            class="StructureEditorItem-main-title"
            :class="{ 'state-inherited': isPropInherited('title') }"
          ></caption-string>
          <template #editor="{ applyRenaming }">
            <div
              ref="mainEditItem"
              class="StructureEditorItem-main-editor"
              @vue:mounted="_editMainMounted"
              @focusout="_mainEditFocusOut($event, applyRenaming)"
            >
              <ims-text-input
                ref="mainEditTitle"
                class="StructureEditorItem-main-editor-title"
                :model-value="mainEditItem.propTitle ?? ''"
                @update:model-value="mainEditSetTitle($event)"
              ></ims-text-input>
              <attribute-type-prop-editor
                ref="mainEditType"
                class="StructureEditorItem-main-editor-type"
                :model-value="mainEditItem.type"
                @update:model-value="mainEditItem.type = $event"
              ></attribute-type-prop-editor>
              <div
                v-if="mainEditServiceNameError"
                class="StructureEditorItem-main-editor-error"
                :title="mainEditServiceNameError"
              >
                <i class="ri-error-warning-fill"></i>
              </div>
              <div
                v-else
                class="StructureEditorItem-main-editor-name-icon"
                :title="$t('assetEditor.struct.serviceName')"
              >
                <i class="ri-price-tag-3-fill"></i>
              </div>
              <ims-text-input
                ref="mainEditName"
                :model-value="mainEditItem.propName"
                :validation-error="mainEditServiceNameError"
                class="StructureEditorItem-main-editor-name"
                @update:model-value="mainEditSetName($event)"
              ></ims-text-input>
              <button
                :style="{
                  visibility:
                    item.propName === mainEditItem.propName
                      ? 'hidden'
                      : undefined,
                }"
                class="StructureEditorItem-main-editor-name-undo is-button is-button-icon"
                :title="$t('assetEditor.struct.revertServiceNameChange')"
                @click="mainEditSetName(item.propName ?? '')"
              >
                <i class="ri-arrow-go-back-line"></i>
              </button>
            </div>
          </template>
        </renamable-text>
        <div v-if="!isMainEditMode" class="StructureEditorItem-main-type">
          <attribute-type-prop-presenter
            class="StructureEditorItem-main-type-value"
            :title="$t('assetEditor.struct.type')"
            :class="{ 'state-inherited': isPropInherited('type') }"
            :model-value="item.type"
            @dblclick="editType"
          ></attribute-type-prop-presenter>
        </div>
        <div
          v-if="!isMainEditMode"
          class="StructureEditorItem-main-serviceName"
          :title="$t('assetEditor.struct.serviceName')"
          :class="{ 'state-inherited': isPropInherited('name') }"
          @dblclick="editServiceName"
        >
          <i class="ri-price-tag-3-fill"></i>
          {{ item.propName }}
        </div>
      </div>
    </template>
    <template v-if="!readonly" #item-advanced>
      <div class="PropsBlockChangeSettings-adv-section">
        <div class="PropsBlockChangeSettings-adv-section-content">
          <checkbox-prop-editor
            :model-value="item.multiple"
            :caption="$t('assetEditor.propsBlockFieldIsMultiple')"
            @update:model-value="setFieldParam('multiple', $event)"
          ></checkbox-prop-editor>
        </div>
      </div>
      <div
        v-if="paramsStructForm && paramsStructForm.fields.length > 0"
        class="PropsBlockChangeSettings-adv-section"
      >
        <div class="PropsBlockChangeSettings-adv-section-header">
          {{ $t('assetEditor.propsBlockFieldParameters') }}
        </div>
        <div class="PropsBlockChangeSettings-adv-section-content">
          <props-block-sheet
            ref="sheet"
            :edit-mode="true"
            :form-def="paramsStructForm"
            :form-state="formState"
            @change-props="changeProps($event)"
          ></props-block-sheet>
        </div>
      </div>
      <div
        class="PropsBlockChangeSettings-adv-section PropsBlockChangeSettings-adv-section-hint"
      >
        <div class="PropsBlockChangeSettings-adv-section-header">
          {{ $t('assetEditor.propsBlockFieldHint') }}
        </div>
        <div class="PropsBlockChangeSettings-adv-section-content">
          <string-prop-editor
            :model-value="item.hint"
            @update:model-value="setFieldParam('hint', $event)"
          ></string-prop-editor>
        </div>
      </div>
      <button
        class="is-button is-button-action danger"
        @click="$emit('delete')"
      >
        {{ $t('assetEditor.struct.deleteElement') }}
      </button>
    </template>
  </some-editor-list-item>
</template>
<script lang="ts">
import { defineAsyncComponent, defineComponent, type PropType } from 'vue';
import type { AssetChanger } from '../../../logic/types/AssetChanger';
import SomeEditorListItem from './SomeEditorListItem.vue';
import RenamableText from '../../Common/RenamableText.vue';
import ImsTextInput from '../../Common/ImsTextInput.vue';
import {
  isPropInherited,
  makeBlockRef,
  normalizeAssetPropPart,
  type AssetProps,
  type AssetPropValue,
} from '../../../logic/types/Props';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import UiManager from '../../../logic/managers/UiManager';
import CaptionString from '../../Common/CaptionString.vue';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '../../../logic/types/PropsForm';
import AttributeTypePropPresenter from '../../Props/AttributeTypePropPresenter.vue';
import AttributeTypePropEditor from '../../Props/AttributeTypePropEditor.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import type { FieldTypeController } from '../../../logic/types/FieldTypeController';
import { extractPropsFormState } from '~ims-plugin-base/blocks/PropsBlock/PropsBlock';
import StringPropEditor from '../../Props/StringPropEditor.vue';
import CheckboxPropEditor from '../../Props/CheckboxPropEditor.vue';

export default defineComponent({
  name: 'StructureEditorItem',
  components: {
    SomeEditorListItem,
    RenamableText,
    ImsTextInput,
    CaptionString,
    AttributeTypePropPresenter,
    AttributeTypePropEditor,
    PropsBlockSheet: defineAsyncComponent(
      () => import('~ims-plugin-base/blocks/PropsBlock/PropsBlockSheet.vue'),
    ),
    StringPropEditor,
    CheckboxPropEditor,
  },
  props: {
    block: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    item: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    structureItems: {
      type: Array<PropsFormFieldDef>,
      required: true,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['delete'],
  data() {
    return {
      mainEditItem: { ...this.item },
      isMainEditMode: false,
    };
  },
  computed: {
    mainEditServiceNameError() {
      if (!this.mainEditItem.propName) {
        return this.$t('assetEditor.struct.serviceNameEmpty');
      }
      const already_used = this.structureItems.some(
        (item) =>
          item !== this.item && item.propKey === this.mainEditItem.propKey,
      );
      if (already_used) {
        return this.$t('assetEditor.struct.serviceNameAlreadyInUse');
      }
      return null;
    },

    typeController(): FieldTypeController | null {
      if (!this.item.type) return null;
      return (
        this.$getAppManager().get(EditorManager).getFieldTypesMap()[
          this.item.type
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
          propKey: `fields\\${this.item.index}\\params\\${parameter.name}`,
          hint: parameter.hint,
        });
      }

      return {
        differentFieldsNum: 0,
        fields: form_fields,
      };
    },
    formState(): PropsFormState {
      return extractPropsFormState(this.block);
    },
  },
  watch: {
    isMainEditMode(mode: boolean) {
      if (!mode) {
        if (this.mainEditServiceNameError) {
          this.$getAppManager()
            .get(UiManager)
            .showError(this.mainEditServiceNameError);
          return;
        }
        const op_id = this.assetChanger.makeOpId();
        if (this.mainEditItem.propName !== this.item.propName) {
          this.assetChanger.setBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `fields\\${this.item.index}\\name`,
            this.mainEditItem.propName ?? null,
            op_id,
          );
        }
        if (this.mainEditItem.type !== this.item.type) {
          this.assetChanger.setBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `fields\\${this.item.index}\\type`,
            this.mainEditItem.type,
            op_id,
          );
          this.assetChanger.deleteBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `fields\\${this.item.index}\\params`,
            op_id,
          );
        }
        if (this.mainEditItem.propTitle !== this.item.propTitle) {
          this.assetChanger.setBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `fields\\${this.item.index}\\title`,
            this.mainEditItem.propTitle,
            op_id,
          );
        }
      }
    },
  },
  methods: {
    _editMainMounted() {
      const mainEditTitle = this.$refs['mainEditTitle'] as InstanceType<
        typeof ImsTextInput
      > | null;
      if (!mainEditTitle) {
        return;
      }
      this.mainEditItem = { ...this.item };
      mainEditTitle.selectAll();
    },
    _mainEditFocusOut(event: FocusEvent, applyRenaming) {
      const mainEdit = this.$refs['mainEdit'] as HTMLDivElement | null;
      if (!mainEdit) {
        return;
      }
      if (
        event.relatedTarget &&
        !mainEdit.contains(event.relatedTarget as HTMLElement)
      ) {
        applyRenaming();
      }
    },
    async editType() {
      if (this.readonly) {
        return;
      }
      this.isMainEditMode = true;
      await this.$nextTick();
      const mainEditType = this.$refs['mainEditType'] as InstanceType<
        typeof AttributeTypePropEditor
      > | null;
      if (!mainEditType) {
        return;
      }
      mainEditType.focus();
    },
    async editServiceName() {
      if (this.readonly) {
        return;
      }
      this.isMainEditMode = true;
      await this.$nextTick();
      const mainEditName = this.$refs['mainEditName'] as InstanceType<
        typeof ImsTextInput
      > | null;
      if (!mainEditName) {
        return;
      }
      mainEditName.selectAll();
    },
    mainEditSetTitle(val: string) {
      this.mainEditItem.propTitle = val;
      this.mainEditSetName(normalizeAssetPropPart(val));
    },
    mainEditSetName(val: string) {
      this.mainEditItem.propName = val;
      this.mainEditItem.propKey = normalizeAssetPropPart(val);
    },
    isPropInherited(prop: string) {
      const key = `fields\\${this.item.index}\\${prop}`;
      return (
        isPropInherited(key, this.block.props, this.block.inherited ?? {}) &&
        this.block.props[key] === undefined
      );
    },
    setFieldParam(param: string, value: AssetPropValue) {
      const key = `fields\\${this.item.index}\\${param}`;
      this.assetChanger.setBlockPropKey(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        key,
        value,
      );
    },
    changeProps(changes: AssetProps[]) {
      this.assetChanger.registerBlockPropsChanges(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        changes,
      );
    },
  },
});
</script>
<style lang="scss" scoped>
.StructureEditorItem-main-editor {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.StructureEditorItem-main-editor-text {
  user-select: none;
  white-space: nowrap;
}
.StructureEditorItem-main-editor-name-icon,
.StructureEditorItem-main-serviceName {
  color: var(--local-sub-text-color);
}
.StructureEditorItem-main,
.StructureEditorItem-main-editor {
  display: flex;
  gap: 5px;
  align-items: center;
}
.StructureEditorItem-main-renamable {
  flex: 1;
  &:not(:last-child) {
    max-width: 300px;
  }
}

.StructureEditorItem-main-editor-title {
  flex: 2;
}
.StructureEditorItem-main-editor-type {
  flex: 2;
}
.StructureEditorItem-main-editor-name {
  flex: 1;
}
.StructureEditorItem-main-type {
  flex: 1;
}
.StructureEditorItem-main-editor-error {
  color: var(--color-danger);
}

.StructureEditorItem-main-title.state-inherited,
.StructureEditorItem-main-serviceName.state-inherited,
.StructureEditorItem-main-type-value.state-inherited {
  color: var(--color-inherited-value);
}
.StructureEditorItem-main-type-value {
  padding: 0;
}
.PropsBlockChangeSettings-adv-section {
  margin-bottom: 10px;
}
.PropsBlockChangeSettings-adv-section-hint
  .PropsBlockChangeSettings-adv-section-content {
  background: var(--local-bg-color);
  border-radius: var(--panel-border-radius);
}
.PropsBlockChangeSettings-adv-section-header {
  font-weight: bold;
}
</style>
