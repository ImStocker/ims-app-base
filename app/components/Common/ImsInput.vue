<template>
  <div
    class="ImsInput is-input"
    :class="{ focus: isFocused, disabled: disabled }"
    @click="focus"
  >
    <div v-if="autoExtend" ref="shadow" class="ImsInput-shadow is-input"></div>
    <div class="ImsInput-prepend">
      <slot name="prepend"></slot>
    </div>
    <input
      v-if="type !== 'textarea'"
      ref="input"
      v-model="ownModelValue"
      class="is-input ImsInput-inner"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :min="min"
      :max="max"
      @change="emitChange()"
      @focus="onFocus"
      @blur="onBlur"
      @keyup.enter="emitValue($event)"
    />
    <textarea
      v-else
      ref="input"
      v-model="ownModelValue"
      class="is-input ImsInput-inner"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @focus="isFocused = true"
      @blur="onBlur"
    />
    <div class="ImsInput-append">
      <slot name="append"></slot>
    </div>
  </div>
</template>
<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';

export default defineComponent({
  name: 'ImsInput',
  props: {
    placeholder: {
      type: String,
      default: null,
    },
    type: {
      type: String as PropType<
        'textarea' | 'text' | 'date' | 'password' | 'email' | 'tel' | 'number'
      >,
      default: 'text',
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    selectOnFocus: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    min: {
      type: Number,
      default: null,
    },
    max: {
      type: Number,
      default: null,
    },
    autoExtend: {
      type: Boolean,
      default: false,
    },
    createWithEnter: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:model-value', 'blur', 'change', 'focus'],
  data() {
    return {
      wasExtended: false,
      isFocused: false,
      ownModelValue: this.modelValue ?? this.value,
    };
  },
  watch: {
    modelValue() {
      if (this.ownModelValue !== this.modelValue) {
        this.ownModelValue = this.modelValue;
      }
    },
    ownModelValue() {
      if (this.ownModelValue !== this.modelValue) {
        this.$emit('update:model-value', this.ownModelValue);
      }
      this.updateSize();
    },
    autoExtend() {
      this.updateSize();
    },
  },
  mounted() {
    if (this.autofocus) {
      setTimeout(() => {
        this.focus();
      }, 1);
    }
    this.updateSize();
  },
  methods: {
    focus() {
      this.$nextTick(() => {
        if (!this.$refs.input) return;
        (this.$refs.input as HTMLElement).focus();
      });
    },
    select() {
      if (!this.$refs.input) return;
      (this.$refs.input as HTMLInputElement).select();
    },
    onBlur() {
      this.isFocused = false;
      this.$emit('blur');
    },
    onFocus() {
      this.isFocused = true;
      if (this.selectOnFocus) {
        this.select();
      }
      this.$emit('focus');
    },
    updateSize() {
      if (!this.$el) return;
      if (!this.autoExtend) {
        if (this.wasExtended) {
          this.$el.style.removeProperty('--ImsInput-autoWidth');
          this.wasExtended = false;
        }
        return;
      }
      if (!this.$refs['shadow']) return;
      (this.$refs['shadow'] as HTMLDivElement).innerText = this.ownModelValue;
      this.$el.style.setProperty(
        '--ImsInput-autoWidth',
        (this.$refs['shadow'] as HTMLDivElement).clientWidth + 'px',
      );
      this.wasExtended = true;
    },
    emitChange() {
      if (this.ownModelValue !== this.modelValue) {
        this.$emit('change', this.ownModelValue);
        this.$nextTick(() => {
          if (this.ownModelValue !== this.modelValue) {
            this.ownModelValue = this.modelValue;
          }
        });
      }
    },
    emitValue(val: any) {
      if (this.createWithEnter) {
        this.ownModelValue = val.target.value;
        this.$emit('change', this.ownModelValue);
        this.onBlur();
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.ImsInput {
  display: flex;
  align-items: center;
  position: relative;
  --ImsInput-autoWidth: 100%;
  width: var(--ImsInput-autoWidth);
}

.ImsInput-inner {
  padding: 0;
  border: none;
  outline: none;
  flex: 1;
  min-width: 0;
  border-radius: 0px;
}

.ImsInput-shadow {
  position: absolute;
  top: 0;
  left: 0;
  border-width: 0;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
}
</style>
