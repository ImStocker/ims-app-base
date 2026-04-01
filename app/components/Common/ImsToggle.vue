<template>
  <div class="ImsToggle">
    <input v-model="ownModelValue" type="checkbox" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ImsToggle',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: boolean) {
        this.$emit('update:model-value', val);
      },
    },
  },
});
</script>
<style lang="scss" scoped>
.ImsToggle {
  display: flex;
  input {
    font-size: 1rem;
    appearance: none;
    width: 3.125em; // 50px
    height: 1.875em; // 30px
    border-radius: 1.5625em; // 25px
    border: 1px solid var(--local-border-color);
    position: relative;
    transition: background 0.3s;
    outline: none;
    cursor: pointer;

    &::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      width: 1.25em;
      height: 1.25em;
      width: 1.6em;
      height: 1.6em;
      background-color: rgb(255, 255, 255);
      top: 50%;
      left: 30%;
      transform: translate(-50%, -50%);
      transition: left 0.3s;
    }

    &:checked {
      background-color: var(--color-accent);
      border: none;

      &::after {
        left: 70%;
      }
    }

    &:focus-visible {
      outline: 1px solid #ccc;
    }
  }
}
</style>
