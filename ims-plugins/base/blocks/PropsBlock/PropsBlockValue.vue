<template>
  <div class="AssetEditorPropsBlockValue" @imc-focus-at="onFocusAt">
    <div class="AssetEditorPropsBlockValue-main">
      <div
        v-if="computedState === false"
        class="AssetEditorPropsBlockValue-loader"
      >
        <div class="loaderSpinner"></div>
        {{ $t('assetEditor.computing') }}
      </div>
      <div
        v-if="computedState !== true"
        class="AssetEditorPropsBlockValue-error"
      >
        <i class="ri-error-warning-fill"></i>
        {{ computedState }}
      </div>
      <div
        v-if="fieldTypeInfo.loading"
        class="AssetEditorPropsBlockValue-loader"
      >
        <div class="loaderSpinner"></div>
        {{ $t('common.loading') }}
      </div>
      <template v-else-if="editMode && !field.differentDefinition">
        <div
          v-if="!sameValue && !changeDifferent"
          class="AssetEditorPropsBlockValue-different"
          @click="activateChangeDifferent"
        >
          {{ $t('assetEditor.differentValues') }}
        </div>
        <async-component
          :is="fieldTypeInfo.controller.editor"
          v-else-if="fieldTypeInfo.controller"
          @error="_componentLoadError('editor', $event)"
          ><template #default="{ component }">
            <component
              :is="component"
              v-bind="fieldParamsPlain"
              ref="editor"
              :has-create-new-option="true"
              :edit-mode="true"
              :model-value="modelValue"
              :different-value="!sameValue"
              :form-state="formState"
              :field="field"
              @change-props="$emit('changeProps', $event)"
              @update:model-value="$emit('update:modelValue', $event)"
              @blur="onEditorBlur"
              @enter="$emit('enter')"
              v-on="{
                inputProps: onInputProps ? onInputProps : null,
                inputValue: onInputValue ? onInputValue : null,
              }"
            ></component>
          </template>
        </async-component>
        <div v-else class="AssetEditorPropsBlockValue-undefinedFieldType">
          {{
            $t('assetEditor.unregisteredFieldType', {
              type: fieldTypeInfo.type,
            })
          }}
        </div>
      </template>
      <template v-else>
        <div
          v-if="field.differentDefinition"
          class="AssetEditorPropsBlockValue-different"
        >
          {{ $t('assetEditor.differentAttributes') }}
        </div>
        <div v-if="!sameValue" class="AssetEditorPropsBlockValue-different">
          {{ $t('assetEditor.differentValues') }}
        </div>
        <async-component
          :is="presenterComponent"
          v-else
          @error="_componentLoadError('presenter', $event)"
          ><template #default="{ component }">
            <component
              :is="component"
              v-bind="fieldParamsPlain"
              ref="presenter"
              :model-value="modelValue"
              :edit-mode="false"
              :form-state="formState"
              :field="field"
              :display-mode="displayMode"
              @change-props="$emit('changeProps', $event)"
              @update:model-value="$emit('update:modelValue', $event)"
              v-on="{
                inputProps: onInputProps ? onInputProps : null,
                inputValue: onInputValue ? onInputValue : null,
              }"
            ></component> </template
        ></async-component>
      </template>
    </div>
    <form-builder-field-tooltip
      v-if="fieldTypeInfo.hint"
      class="AssetEditorPropsBlockValue-hint"
      :message="fieldTypeInfo.hint"
    ></form-builder-field-tooltip>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  type AssetPropValue,
  convertAssetPropsToPlainObject,
} from '#logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import FormBuilderFieldTooltip from '#components/Form/FormBuilderFieldTooltip.vue';
import StringPropPresenter from '#components/Props/StringPropPresenter.vue';
import type { AssetDisplayMode } from '#logic/utils/assets';
import type { FieldTypeController } from '#logic/types/FieldTypeController';
import EditorManager from '#logic/managers/EditorManager';
import AsyncComponent from '#components/Common/AsyncComponent.vue';

export default defineComponent({
  name: 'AssetEditorPropsBlockValue',
  components: { FormBuilderFieldTooltip, AsyncComponent },
  props: {
    editMode: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [Object, String, Number, Boolean, null] as PropType<AssetPropValue>,
      default: null,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    sameValue: {
      type: Boolean,
      default: true,
    },
    computedState: {
      type: [Boolean, String],
      default: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    onInputProps: {
      type: Function,
      default: null,
    },
    onInputValue: {
      type: Function,
      default: null,
    },
  },
  emits: ['update:modelValue', 'enter', 'changeProps', 'inputProps', 'input'],
  data() {
    return {
      changeDifferent: false,
      lastComponentLoadError: null as string | null,
    };
  },
  computed: {
    fieldParamsPlain() {
      return {
        ...(this.fieldTypeInfo.controller &&
        this.editMode &&
        this.fieldTypeInfo.controller.editorProps
          ? this.fieldTypeInfo.controller.editorProps
          : {}),
        ...(this.fieldTypeInfo.controller &&
        !this.editMode &&
        this.fieldTypeInfo.controller.presenterProps
          ? this.fieldTypeInfo.controller.presenterProps
          : {}),
        ...convertAssetPropsToPlainObject(this.field.params),
      };
    },
    fieldTypeInfo(): {
      loading: boolean;
      error: string | null;
      type: string;
      hint: AssetPropValue | null;
      controller: FieldTypeController | undefined;
    } {
      const type = this.field.type ? this.field.type : 'text';
      const hint = this.field.hint;
      const map = this.$getAppManager().get(EditorManager).getFieldTypesMap();
      const controller = map.hasOwnProperty(type) ? map[type] : undefined;
      return {
        loading: false,
        error: null,
        type,
        hint: hint ?? null,
        controller,
      };
    },
    presenterComponent() {
      if (this.fieldTypeInfo.controller)
        return this.fieldTypeInfo.controller.presenter;
      else return async () => StringPropPresenter;
    },
  },
  watch: {},
  mounted() {},
  methods: {
    async awaitComponentReady() {
      this.lastComponentLoadError = null;
      for (let attempt = 0; attempt < 15; attempt++) {
        if (this.lastComponentLoadError) {
          throw new Error(this.lastComponentLoadError);
        }
        if (this.editMode) {
          if (!this.fieldTypeInfo.controller) {
            throw new Error('Controller is not set');
          }
          if (this.$refs['editor']) return;
        } else {
          if (this.$refs['presenter']) return;
        }
        await new Promise((res) => setTimeout(res, attempt * 100 + 1));
      }
      throw new Error('Failed to load component: too many retries');
    },
    _componentLoadError(_type: 'editor' | 'presenter', err: Error) {
      this.lastComponentLoadError = err.message;
    },
    _callComponentCommand(method: string, args: any[] = []): boolean {
      if (!this.$refs.editor) return false;
      if ((this.$refs.editor as any)[method]) {
        (this.$refs.editor as any)[method](...args);
        return true;
      }
      return false;
    },
    focus() {
      return this._callComponentCommand('focus');
    },
    activate() {
      return this._callComponentCommand('activate');
    },
    onFocusAt(ev: CustomEvent) {
      if (this._callComponentCommand('focusAt', [ev])) {
        return true;
      }
      return this._callComponentCommand('focus');
    },
    selectAll() {
      if (this._callComponentCommand('selectAll')) {
        return true;
      }
      return this._callComponentCommand('focus');
    },
    focusEnd() {
      if (this._callComponentCommand('focusEnd')) {
        return true;
      }
      return this._callComponentCommand('focus');
    },
    activateChangeDifferent() {
      this.changeDifferent = true;
      this.$nextTick(() => {
        const editor = this.$refs.editor as any;
        if (!editor) return;
        if (!editor.focus) return;
        editor.focus();
      });
    },
    onEditorBlur() {
      this.changeDifferent = false;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorPropsBlockValue-different {
  padding: 5px;
  font-style: italic;
  color: #999;
}

.AssetEditorPropsBlockValue-undefinedFieldType {
  color: var(--color-main-error);
}

.AssetEditorPropsBlockValue-loader {
  display: inline-block;
  color: #999;
  font-style: italic;

  .loaderSpinner {
    font-size: 5px;
    margin: 3px;
    position: relative;
    top: 3px;
  }
}

.AssetEditorPropsBlockValue-error {
  color: var(--color-main-error);

  .ri-error-warning-fill {
    cursor: pointer;
  }
}

.AssetEditorPropsBlockValue {
  display: flex;
  min-width: 0;
}

.AssetEditorPropsBlockValue-main {
  flex: 1;
  min-width: 0;
}

.AssetEditorPropsBlockValue-hint {
  margin-left: 5px;
  margin-right: 5px;
}
</style>
