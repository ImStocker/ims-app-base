<template>
  <div class="ImsInputPassword">
    <input
      ref="inputEl"
      class="is-input ImsInputPassword-input"
      :type="isVisible ? 'text' : 'password'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <button
      type="button"
      class="ImsInputPassword-toggle"
      :class="{ 'ImsInputPassword-toggle--visible': isVisible }"
      :disabled="disabled"
      :title="isVisible ? t('common.hidePassword') : t('common.showPassword')"
      tabindex="-1"
      @mousedown.prevent
      @click="toggleVisibility"
    >
      <i :class="isVisible ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '#imports';

withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    disabled?: boolean;
    autocomplete?: string;
  }>(),
  {
    modelValue: '',
    placeholder: '',
    disabled: false,
    autocomplete: 'off',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'focus' | 'blur', event: FocusEvent): void;
}>();

const { t } = useI18n();

const isVisible = ref(false);
const inputEl = ref<HTMLInputElement | null>(null);

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}

function onFocus(event: FocusEvent) {
  emit('focus', event);
}

function onBlur(event: FocusEvent) {
  emit('blur', event);
}

function toggleVisibility() {
  isVisible.value = !isVisible.value;
  inputEl.value?.focus();
}
</script>

<style lang="scss" scoped>
.ImsInputPassword {
  position: relative;
  width: 100%;
}

.ImsInputPassword-input {
  width: 100%;
  padding-right: 2.2em;
}

.ImsInputPassword-toggle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.6em;
  border: none;
  background: transparent;
  color: var(--input-placeholder-color);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
}
</style>
