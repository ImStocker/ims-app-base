<template>
  <ims-input
    ref="input"
    v-model="editingValue"
    :placeholder="placeholder"
    :type="type"
    :autofocus="autofocus"
    :disabled="disabled"
    :readonly="readonly"
    :create-with-enter="createWithEnter"
    @blur="onBlur"
  ></ims-input>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import ImsInput from '../Common/ImsInput.vue';

export default defineComponent({
  title: 'FormInput',
  meta: {
    modelProp: 'value',
    modelEvent: 'input',
  },
  components: {
    ImsInput,
  },
  props: {
    value: {
      type: [String, Number] as PropType<string | number>,
      default: () => '',
    },
    placeholder: {
      type: String,
      default: () => '',
    },
    type: {
      type: String as PropType<
        'textarea' | 'text' | 'date' | 'password' | 'email' | 'tel' | 'number'
      >,
      default: () => 'text',
    },
    autofocus: {
      type: Boolean,
      default: () => false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    createWithEnter: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['input', 'change'],
  computed: {
    editingValue: {
      get() {
        return this.value;
      },
      set(val: string | number) {
        this.$emit('input', val);
      },
    },
  },
  methods: {
    selectAll() {
      if (!this.$refs['input']) return;
      (this.$refs['input'] as any).select();
    },
    focus() {
      if (!this.$refs['input']) return;
      (this.$refs['input'] as any).focus();
    },
    onBlur() {
      if (this.value !== this.editingValue) {
        this.$emit('change', this.editingValue);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
