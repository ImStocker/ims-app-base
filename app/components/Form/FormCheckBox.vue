<template>
  <div class="FormCheckbox">
    <label class="FormCheckbox-content" :title="helpText">
      <input
        class="FormCheckbox-content-checkbox"
        type="checkbox"
        :checked="value"
        :indeterminate="differentValue"
        :disabled="disabled"
        @click="emitValue(($event.target as any).checked)"
      />
      <i
        class="FormCheckbox-content-icon"
        :class="{
          'ri-checkbox-blank-line': !differentValue && !value,
          'ri-checkbox-line': !differentValue && value,
          [icon]: !differentValue && value,
          'ri-checkbox-indeterminate-line': differentValue,
          disabled: disabled,
        }"
      ></i>
      <div v-if="$slots.default || caption" class="FormCheckbox-content-text">
        <slot>{{ caption }}</slot>
      </div>
    </label>
    <slot name="tooltip"></slot>
  </div>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FormCheckBox',
  meta: {
    containsCaption: true,
    modelProp: 'value',
    modelEvent: 'input',
  },
  components: {},
  props: {
    value: { type: Boolean },
    caption: { type: String, default: '' },
    icon: { type: String, default: '' },
    helpText: { type: String, default: '' },
    differentValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['input'],
  mounted() {},
  methods: {
    emitValue(val: boolean) {
      this.$emit('input', val);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss">
.FormCheckbox {
  display: inline-flex;
  align-items: center;
}

.FormCheckbox-content-checkbox {
  display: none;
}

.FormCheckbox-content {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.FormCheckbox-content-text {
  flex: 1;
  margin-left: 5px;
}

.FormCheckbox-content-icon {
  font-size: 24px;
  line-height: 24px;
  cursor: pointer;
  color: #ccc;
  display: block;
  &.disabled:hover {
    color: #ccc !important;
  }
  &:hover {
    color: var(--color-main-yellow);
  }
  &.ri-checkbox-line,
  &.ri-checkbox-indeterminate-line {
    color: var(--color-main-yellow);
    &.disabled:hover {
      color: var(--color-main-yellow) !important;
    }
    &:hover {
      color: #ccc;
    }
  }
}
</style>
