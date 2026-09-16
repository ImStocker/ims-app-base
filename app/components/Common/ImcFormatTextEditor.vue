<template>
  <component
    :is="activeEditor"
    ref="editor"
    v-bind="editorProps"
    @update:model-value="$emit('update:modelValue', $event)"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @enter="$emit('enter', $event)"
    @pre-enter="$emit('preEnter', $event)"
    @escape="$emit('escape', $event)"
    @view-ready="$emit('view-ready', $event)"
    @input-value="$emit('inputValue', $event)"
    @paste="$emit('paste', $event)"
  ></component>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  AssetPropType,
  type AssetPropValue,
  castAssetPropValueToString,
  getAssetPropType,
} from '../../logic/types/Props';
import ImcEditor from '../ImcText/ImcEditor.vue';
import ImcMarkdownEditor from '../ImcMarkdownEditor/ImcMarkdownEditor.vue';

export default defineComponent({
  name: 'ImcFormatTextEditor',
  components: { ImcEditor, ImcMarkdownEditor },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean, null] as PropType<AssetPropValue>,
      default: null,
    },
    placeholder: {
      type: String,
      default: null,
    },
    multiline: {
      type: Boolean,
      default: false,
    },
    toolbar: {
      type: String,
      default: 'default',
    },
    maxHeight: {
      type: Number,
      default: null,
    },
    allowTab: {
      type: Boolean,
      default: true,
    },
    onInputValue: {
      type: Function,
      default: null,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    useMd: {
      type: Boolean,
      default: false,
    },
    getHeaderAnchor: {
      type: Function,
      default: null,
    },
    blockId: {
      type: String,
      default: '',
    },
  },
  emits: [
    'update:modelValue',
    'focus',
    'blur',
    'enter',
    'preEnter',
    'escape',
    'view-ready',
    'inputValue',
    'paste',
  ],
  computed: {
    isRichText(): boolean {
      return getAssetPropType(this.modelValue) === AssetPropType.TEXT;
    },
    activeEditor() {
      if (!this.useMd) return ImcEditor;
      return this.isRichText ? ImcEditor : ImcMarkdownEditor;
    },
    markdownValue(): string {
      const v = this.modelValue;
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v;
      if (this.isRichText) return castAssetPropValueToString(v);
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return castAssetPropValueToString(v);
    },
    editorProps(): Record<string, unknown> {
      if (!this.useMd || this.isRichText) {
        return {
          modelValue: this.modelValue,
          placeholder: this.placeholder,
          multiline: this.multiline,
          toolbar: this.toolbar,
          maxHeight: this.maxHeight,
          allowTab: this.allowTab,
          onInputValue: this.onInputValue,
          readonly: this.readonly,
          getHeaderAnchor: this.getHeaderAnchor,
        };
      }
      return {
        modelValue: this.markdownValue,
        readonly: this.readonly,
        blockId: this.blockId,
      };
    },
    quillController() {
      const editor: any = this.$refs['editor'] ?? null;
      return editor?.quillController ?? null;
    },
  },
  methods: {
    _innerEditor(): any {
      return this.$refs['editor'] ?? null;
    },
    focus() {
      this._innerEditor()?.focus?.();
    },
    focusEnd() {
      this._innerEditor()?.focusEnd?.();
    },
    focusAt(clientX: number, clientY: number) {
      this._innerEditor()?.focusAt?.(clientX, clientY);
    },
    selectAll() {
      this._innerEditor()?.selectAll?.();
    },
    resetDirtyValue() {
      this._innerEditor()?.resetDirtyValue?.();
    },
    emitDirty(): boolean {
      return this._innerEditor()?.emitDirty?.() ?? false;
    },
    isFocused(): boolean {
      return this._innerEditor()?.isFocused?.() ?? false;
    },
    deactivate(): boolean {
      return this._innerEditor()?.deactivate?.() ?? false;
    },
    getSelection() {
      return this._innerEditor()?.getSelection?.() ?? null;
    },
  },
});
</script>
