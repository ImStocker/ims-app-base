<template>
  <div class="ImsTextInput">
    <input
      v-if="!wordWrap"
      ref="input"
      v-model="ownModelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      type="text"
      :class="{
        'state-error': !!error,
      }"
      class="ImsTextInput-input"
      :title="error ? error : title"
      @blur="onBlur"
      @keydown="_keydownHandler($event)"
    />
    <template v-else>
      <div ref="hidden" class="ImsTextInput-input-hidden">
        {{ ownModelValue }}<template v-if="!ownModelValue">&nbsp;</template>
      </div>
      <textarea
        ref="input"
        v-model="ownModelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        type="textarea"
        :class="{
          'state-error': !!error,
        }"
        class="ImsTextInput-input"
        :title="error ? error : title"
        @blur="onBlur"
        @keydown="_keydownHandler"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ImsTextInput',
  props: {
    title: {
      type: String,
      default: '',
    },
    wordWrap: {
      type: Boolean,
      default: false,
    },
    multiline: {
      type: Boolean,
      default: false,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    validationError: {
      type: [String, null],
      default: null,
    },
    modelValue: {
      type: String,
      default: null,
    },
    placeholder: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['blur', 'enter', 'escape', 'update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: string) {
        this.$emit('update:model-value', val);
      },
    },
    error() {
      if (!this.validationError) return;
      return this.validationError;
    },
  },
  mounted() {
    if (this.wordWrap) {
      this._requestUpdateTextAreaSize();
      this._resetResizeObserver(true);
    }
    if (this.autofocus) {
      this.$nextTick(() => {
        this.focus();
      });
    }
  },
  unmounted() {
    this._resetResizeObserver();
  },
  methods: {
    onBlur() {
      this.$emit('blur');
    },
    focus() {
      if (!this.$refs['input']) return;
      (this.$refs['input'] as HTMLInputElement).focus();
    },
    selectRange(from: number, end: number) {
      if (!this.$refs['input']) return;
      (this.$refs['input'] as HTMLInputElement).focus();
      (this.$refs['input'] as HTMLInputElement).setSelectionRange(from, end);
    },
    selectAll() {
      if (!this.$refs['input']) return;
      (this.$refs['input'] as HTMLInputElement).focus();
      (this.$refs['input'] as HTMLInputElement).select();
    },
    _requestUpdateTextAreaSize() {
      if ((this as any)._requestUpdateTextAreaSize_requested) return;
      (this as any)._requestUpdateTextAreaSize_requested = true;
      this.$nextTick(() => {
        this._updateTextAreaSize();
        (this as any)._requestUpdateTextAreaSize_requested = false;
      });
    },
    _updateTextAreaSize() {
      if (!this.$refs['hidden'] || !this.$refs['input']) {
        return;
      }
      if (this.wordWrap) {
        (this.$refs['input'] as HTMLInputElement).style.height =
          (this.$refs['hidden'] as HTMLElement).clientHeight + 'px';
        if ((this.$refs['input'] as HTMLInputElement).scrollTop !== 0)
          (this.$refs['input'] as HTMLInputElement).scrollTop = 0;
      } else (this.$refs['input'] as HTMLInputElement).style.height = '';
    },
    _resetResizeObserver(init = true) {
      if ((this as any)._resizeObserver) {
        (this as any)._resizeObserver.disconnect();
        (this as any)._resizeObserver = null;
      }
      if (init) {
        if (typeof window.ResizeObserver === 'undefined') return;
        if (!this.$refs['hidden']) return;
        (this as any)._resizeObserver = new window.ResizeObserver(() => {
          window.requestAnimationFrame(() => {
            (this as any)._requestUpdateTextAreaSize();
          });
        });
        (this as any)._resizeObserver.observe(this.$refs['hidden']);
      }
    },
    _keydownHandler(e: KeyboardEvent) {
      if (e.code === 'Enter') {
        e.preventDefault();
        this.$emit('enter');
      } else if (e.code === 'Escape') {
        this.$emit('escape');
        e.preventDefault();
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.ImsTextInput {
  display: flex;
  position: relative;
}

.ImsTextInput-input-hidden {
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  width: 100%;
  height: auto;
  text-align: start;
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  overflow-y: visible;

  padding: 0;
  background: transparent;
}

.ImsTextInput-input {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
  font-style: inherit;
  font-weight: inherit;
  border-radius: 0;
  border: none;
  width: 100%;
  display: block;

  &.state-error {
    color: var(--color-main-error);
  }
}

textarea {
  overflow: hidden;
  height: max-content;
}
</style>
