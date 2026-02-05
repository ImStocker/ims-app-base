<template>
  <div
    class="AssetEditorPropsBlockProp"
    :class="{
      'state-error': editMode && valueError,
    }"
    @imc-focus-at="onFocusAt"
  >
    <slot
      name="prepend"
      :computed-state="computedState"
      :edit-mode="editMode"
    ></slot>
    <div
      v-if="computedState === false"
      class="AssetEditorPropsBlockProp-loader"
    >
      <div class="loaderSpinner"></div>
      {{ $t('assetEditor.computing') }}
    </div>
    <div v-if="computedState !== true" class="AssetEditorPropsBlockProp-error">
      <i class="ri-error-warning-fill"></i>
      {{ computedState }}
    </div>
    <template v-else-if="editMode">
      <i
        v-if="valueError"
        class="ri-error-warning-fill AssetEditorPropsBlockProp-editError"
        :title="valueError"
      ></i>
      <string-prop-editor
        ref="editor"
        class="AssetEditorPropsBlockProp-editor"
        :model-value="dirtyValue"
        @update:model-value="setValue($event)"
        @keydown="onKeydown"
        @pre-enter="$emit('preEnter')"
      ></string-prop-editor>
      <slot name="menu"></slot>
    </template>
    <template v-else>
      <caption-string
        class="AssetEditorPropsBlockProp-static"
        :value="propTitle"
      ></caption-string>
    </template>
    <slot
      name="append"
      :computed-state="computedState"
      :edit-mode="editMode"
    ></slot>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  type AssetPropValue,
  castAssetPropValueToString,
} from '#logic/types/Props';
import CaptionString from '#components/Common/CaptionString.vue';
import StringPropEditor from '#components/Props/StringPropEditor.vue';

export default defineComponent({
  name: 'AssetEditorPropsBlockProp',
  components: { StringPropEditor, CaptionString },
  props: {
    editMode: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: [Object, String, Number, Boolean, null] as PropType<AssetPropValue>,
      default: null,
    },
    sameValue: {
      type: Boolean,
      default: true,
    },
    computedState: {
      type: [Boolean, String],
      default: true,
    },
    validateValue: {
      type: Function as PropType<(val: string) => string | null>,
      required: true,
    },
  },
  emits: ['update:modelValue', 'tab', 'preEnter'],
  data() {
    return {
      dirtyValue: this.modelValue,
    };
  },
  computed: {
    propTitle() {
      return castAssetPropValueToString(this.modelValue);
    },
    valueError() {
      if (this.dirtyValue !== this.modelValue) {
        return this.validateValue(
          this.dirtyValue ? castAssetPropValueToString(this.dirtyValue) : '',
        );
      }
      return null;
    },
  },
  watch: {
    modelValue() {
      this.dirtyValue = this.modelValue;
    },
    editMode() {
      this.dirtyValue = this.modelValue;
    },
  },
  methods: {
    async setValue(val: string) {
      this.dirtyValue = val;
      if (!this.valueError) {
        this.$emit('update:modelValue', val);
        await this.$nextTick();
        this.dirtyValue = this.modelValue;
      }
    },
    focus() {
      if (!this.$refs.editor) return;
      if ((this.$refs.editor as any).focus) {
        (this.$refs.editor as any).focus();
      }
    },
    onFocusAt(ev: CustomEvent) {
      if (!this.$refs.editor) return;
      if ((this.$refs.editor as any).focusAt) {
        (this.$refs.editor as any).focusAt(
          ev.detail.clientX,
          ev.detail.clientY,
        );
      }
      if ((this.$refs.editor as any).focus) {
        (this.$refs.editor as any).focus();
      }
    },
    onKeydown(ev: KeyboardEvent) {
      if (ev.code === 'Tab') {
        this.$emit('tab', {
          shiftKey: !!ev.shiftKey,
        });
        ev.preventDefault();
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorPropsBlockProp {
  display: flex;
  align-items: center;
}

.AssetEditorPropsBlockProp-static {
  display: block;
  padding: 5px;
}

.AssetEditorPropsBlockProp-input {
  padding: 5px 10px;
  display: block;
  box-sizing: border-box;
  background: transparent;
  border: none;
  font-size: var(--local-font-size);
  color: var(--text-intense);
}

.AssetEditorPropsBlockProp-loader {
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

.AssetEditorPropsBlockProp-error {
  color: var(--color-main-error);

  .ri-error-warning-fill {
    cursor: pointer;
  }
}

.AssetEditorPropsBlockProp-editor {
  flex: 1;
  --input-padding: 5px;
}

.AssetEditorPropsBlockProp.state-error {
  color: var(--color-main-error);
  position: relative;
}

.AssetEditorPropsBlockProp-editError {
  position: absolute;
  top: 5px;
  left: 3px;
}

.AssetEditorPropsBlockProp.state-error:deep(.StringPropEditor-input) {
  padding-left: 20px;
}
</style>
