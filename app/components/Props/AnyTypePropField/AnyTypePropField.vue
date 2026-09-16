<template>
  <text-prop-editor
    v-if="editMode"
    ref="editor"
    class="AnyTypePropField"
    :model-value="editValue"
    :bounds-selector="boundsSelector"
    @update:model-value="onEditorInput"
    @blur="onBlur"
    @enter="onEnter"
    @pre-enter="$emit('preEnter')"
    @input="$emit('input', $event)"
    v-on="{
      inputValue: onInputValue ? onInputValue : null,
    }"
  ></text-prop-editor>
  <component
    :is="presenterComponent"
    v-else
    class="AnyTypePropField"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @blur="$emit('blur')"
  ></component>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
  AssetPropType,
  getAssetPropType,
  type AssetPropValue,
} from '#logic/types/Props';
import TextPropEditor from '../TextPropEditor.vue';
import AssetLinkPropPresenter from '../AssetLinkPropPresenter.vue';
import CheckboxPropPresenter from '../CheckboxPropPresenter.vue';
import TextPropPresenter from '../TextPropPresenter.vue';
import ProjectUserPropPresenter from '../ProjectUserPropPresenter.vue';
import StringPropPresenter from '../StringPropPresenter.vue';
import EnumPropPresenter from '../EnumPropPresenter.vue';
import DateTimePropPresenter from '../DateTimePropPresenter.vue';
import AttachmentPropPresenter from '../AttachmentPropPresenter.vue';

export default defineComponent({
  name: 'AnyTypePropField',
  components: {
    TextPropEditor,
    AssetLinkPropPresenter,
    CheckboxPropPresenter,
    TextPropPresenter,
    ProjectUserPropPresenter,
    StringPropPresenter,
    EnumPropPresenter,
    DateTimePropPresenter,
    AttachmentPropPresenter,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    editMode: {
      type: Boolean,
      default: false,
    },
    boundsSelector: { type: String, default: '' },
    onInputValue: {
      type: Function,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'input'],
  data() {
    return {
      editValue: null as AssetPropValue,
    };
  },
  computed: {
    presenterComponent() {
      switch (getAssetPropType(this.modelValue)) {
        case AssetPropType.ASSET:
          return AssetLinkPropPresenter;
        case AssetPropType.BOOLEAN:
          return CheckboxPropPresenter;
        case AssetPropType.STRING:
        case AssetPropType.TEXT:
          return TextPropPresenter;
        case AssetPropType.ACCOUNT:
          return ProjectUserPropPresenter;
        case AssetPropType.INTEGER:
        case AssetPropType.FLOAT:
          return StringPropPresenter;
        case AssetPropType.ENUM:
          return EnumPropPresenter;
        case AssetPropType.TIMESTAMP:
          return DateTimePropPresenter;
        case AssetPropType.FILE:
          return AttachmentPropPresenter;
        default:
          return StringPropPresenter;
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val: AssetPropValue) {
        this.editValue = val;
      },
    },
  },
  methods: {
    onEditorInput(val: AssetPropValue) {
      this.editValue = val;
    },
    castValue(val: AssetPropValue): AssetPropValue {
      let res_value: AssetPropValue = val;
      const str = typeof val === 'string' ? val.trim() : '';
      if (str !== '') {
        const plain_as_int = /^-?\d+$/.test(str) ? parseInt(str) : null;
        if (
          plain_as_int !== null &&
          plain_as_int >= -Number.MAX_SAFE_INTEGER &&
          plain_as_int <= Number.MAX_SAFE_INTEGER
        ) {
          res_value = plain_as_int;
        } else if (typeof val === 'string') {
          const plain_as_float = /^-?\d+\.\d{1,4}$/.test(str)
            ? parseFloat(str)
            : null;
          if (plain_as_float && plain_as_float.toString() === str) {
            res_value = plain_as_float;
          } else {
            res_value = str;
          }
        }
      }
      return res_value;
    },
    commitValue() {
      this.$emit('update:modelValue', this.castValue(this.editValue));
    },
    onBlur() {
      this.commitValue();
      this.$emit('blur');
    },
    onEnter() {
      this.commitValue();
      this.$emit('enter');
    },
    _callEditorCommand(method: string, args: any[] = []): boolean {
      const editor = this.$refs.editor as any;
      if (!editor) return false;
      if (editor[method]) {
        editor[method](...args);
        return true;
      }
      return false;
    },
    focus() {
      return this._callEditorCommand('focus');
    },
    focusEnd() {
      return this._callEditorCommand('focusEnd');
    },
    focusAt(clientX: number, clientY: number) {
      return this._callEditorCommand('focusAt', [clientX, clientY]);
    },
    selectAll() {
      return this._callEditorCommand('selectAll');
    },
  },
});
</script>

<style lang="scss" scoped>
.AnyTypePropField {
  display: block;
}
</style>
