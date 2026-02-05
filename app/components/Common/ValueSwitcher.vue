<template>
  <div class="ValueSwitcher button-group use-buttons-value-switcher">
    <label
      v-for="option in options"
      :key="option[valueProp]"
      class="ValueSwitcher-item is-button ref-item"
      :class="{ selected: ownModelValue === option[valueProp] }"
    >
      <input
        v-model="ownModelValue"
        type="radio"
        :value="option[valueProp]"
        name="choose"
        class="ValueSwitcher-item-input"
      />
      <span class="ValueSwitcher-item-label"
        ><slot
          name="option"
          :option="option"
          :selected="ownModelValue === option[valueProp]"
          >{{
            getOptionLabel ? getOptionLabel(option) : option[labelProp]
          }}</slot
        ></span
      >
    </label>
  </div>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ValueSwitcher',
  props: {
    options: {
      type: Array as PropType<any>,
      default: () => [],
    },
    modelValue: {
      type: [Object, String, Number, Boolean],
      default: null,
    },
    autofocus: {
      type: Boolean,
      default: false,
    },
    labelProp: {
      type: String,
      default: 'label',
    },
    valueProp: {
      type: String,
      default: 'value',
    },
    getOptionLabel: {
      type: Function,
      default: undefined,
    },
  },
  emits: ['update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: any) {
        if (val !== this.modelValue) {
          this.$emit('update:model-value', val);
        }
      },
    },
  },
  mounted() {
    if (this.autofocus) {
      this.focusCurrentValue();
    }
  },
  methods: {
    focusCurrentValue() {
      const selected_input = this.$el.querySelector('input:checked');
      if (selected_input) {
        selected_input.focus();
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.ValueSwitcher {
  width: 100%;
  display: flex;
  --ValueSwitcher-border-radius: 999px;
}
.ValueSwitcher-item {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;

  &:first-child {
    border-top-left-radius: var(--ValueSwitcher-border-radius);
    border-bottom-left-radius: var(--ValueSwitcher-border-radius);
  }
  &:last-child {
    border-top-right-radius: var(--ValueSwitcher-border-radius);
    border-bottom-right-radius: var(--ValueSwitcher-border-radius);
  }
}
.ValueSwitcher-item-input {
  position: absolute;
  opacity: 0;
  visibility: 0;
  pointer-events: none;
}
</style>
