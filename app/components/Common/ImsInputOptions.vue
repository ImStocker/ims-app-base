<template>
  <div class="ImsInputOptions">
    <div ref="controlEl" class="ImsInputOptions-control">
      <input
        ref="inputEl"
        class="is-input ImsInputOptions-input"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        @focus="onFocus"
        @input="onInput"
        @keydown="onKeydown"
        @blur="onBlur"
      />
      <button
        type="button"
        class="ImsInputOptions-toggle"
        :class="{ open: isOpen }"
        :disabled="disabled"
        tabindex="-1"
        @mousedown.prevent
        @click="toggle"
      >
        <svg
          class="ImsInputOptions-chevron"
          viewBox="0 0 16 16"
          width="16"
          height="16"
        >
          <path
            fill="currentColor"
            d="M4.5 6.2 8 9.7l3.5-3.5-1.1-1.1L8 7.5 5.6 5.1z"
          />
        </svg>
      </button>
    </div>

    <dropdown-element
      v-model:shown="isOpen"
      :attach-to-element="controlEl ?? null"
      attach-position="bottom"
      align-position="start"
      hide-trigger="clickOutsideAttached"
    >
      <div class="ImsInputOptions-dropdown tiny-scrollbars">
        <ul
          v-if="filteredOptions.length > 0"
          class="ImsInputOptions-list"
          @mousedown.prevent
        >
          <li
            v-for="(option, index) in filteredOptions"
            :key="`${option}-${index}`"
            class="ImsInputOptions-option"
            :class="{
              highlight: index === highlightedIndex,
            }"
            @mouseenter="highlightedIndex = index"
            @click="selectOption(option)"
          >
            {{ option }}
          </li>
        </ul>
      </div>
    </dropdown-element>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import DropdownElement from './DropdownElement.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options?: string[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    options: () => [],
    placeholder: '',
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const highlightedIndex = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);
const controlEl = ref<HTMLElement | null>(null);
let blurTimer: ReturnType<typeof setTimeout> | null = null;

const trimmedValue = computed(() => props.modelValue.trim().toLowerCase());

const filteredOptions = computed(() => {
  const value = trimmedValue.value;
  if (!value) return props.options;
  return props.options.filter((option) => option.toLowerCase().includes(value));
});

watch(filteredOptions, (list) => {
  if (highlightedIndex.value >= list.length) {
    highlightedIndex.value = 0;
  }
  if (list.length === 0) {
    isOpen.value = false;
  }
});

function open() {
  if (props.disabled) return;
  if (filteredOptions.value.length === 0) return;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

function onFocus() {
  open();
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', value);
  open();
}

function selectOption(option: string) {
  emit('update:modelValue', option);
  close();
  inputEl.value?.focus();
}

function toggle() {
  if (props.disabled) return;
  if (isOpen.value) {
    close();
  } else {
    open();
    inputEl.value?.focus();
  }
}

function onKeydown(event: KeyboardEvent) {
  const count = filteredOptions.value.length;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    open();
    if (count > 0)
      highlightedIndex.value = (highlightedIndex.value + 1) % count;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    open();
    if (count > 0) {
      highlightedIndex.value = (highlightedIndex.value - 1 + count) % count;
    }
  } else if (event.key === 'Enter') {
    if (isOpen.value && count > 0) {
      event.preventDefault();
      selectOption(
        filteredOptions.value[highlightedIndex.value] ??
          filteredOptions.value[0],
      );
    }
  } else if (event.key === 'Escape') {
    close();
  }
}

function onBlur() {
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(close, 120);
}

onBeforeUnmount(() => {
  if (blurTimer) clearTimeout(blurTimer);
});
</script>

<style lang="scss" scoped>
.ImsInputOptions {
  position: relative;
  width: 100%;
}

.ImsInputOptions-control {
  position: relative;
}

.ImsInputOptions-input {
  width: 100%;
  padding-right: 2em;
}

.ImsInputOptions-toggle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5em;
  border: none;
  background: transparent;
  color: var(--input-placeholder-color);
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
}

.ImsInputOptions-chevron {
  transition: transform 0.15s;
}

.open .ImsInputOptions-chevron {
  transform: rotate(180deg);
}

.ImsInputOptions-dropdown {
  width: var(--DropdownContainer-attachToElement-width);
  max-height: var(--DropdownContainer-freeHeight);
  padding: 0;
  background-color: var(--dropdown-bg-color);
  backdrop-filter: var(--dropdown-bg-filter);
  box-shadow: var(--dropdown-box-shadow);
  border-radius: var(--dropdown-border-radius);
  overflow: auto;
}

.ImsInputOptions-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ImsInputOptions-option {
  padding: var(--dropdown-padding);
  color: var(--local-text-color);
  line-height: 1.2;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover,
  &.highlight {
    background-color: var(--dropdown-hl-bg-color);
  }
}
</style>
