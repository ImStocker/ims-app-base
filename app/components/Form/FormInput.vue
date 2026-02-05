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
  components: {
    ImsInput,
  },
  props: {
    value: {
      type: String,
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
  data() {
    return {
      editingValue: this.value,
    };
  },
  watch: {
    value() {
      if (this.editingValue !== this.value) {
        this.editingValue = this.value;
      }
    },
    editingValue() {
      this.$emit('input', this.editingValue);
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
