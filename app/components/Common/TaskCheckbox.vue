<template>
  <div
    class="TaskCheckbox"
    :class="{
      rounded: rounded,
      disabled: disabled,
      'no-glow': noGlow,
      selected: ownModelValue,
      loading: loading,
    }"
    :style="{ '--task-checkbox-size': size + 'px' }"
    @click="handleClick"
  >
    <input
      v-model="ownModelValue"
      type="checkbox"
      :disabled="disabled"
      class="TaskCheckbox-input-invisible"
    />
    <div class="TaskCheckbox-input-visible">
      <i class="ri-check-line TaskCheckbox-input-visible-inner"></i>
      <span
        v-if="loading"
        class="loaderSpinner TaskCheckbox-input-visible-loader"
      ></span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TaskCheckbox',
  props: {
    size: {
      type: Number,
      default: 20,
    },
    modelValue: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    rounded: {
      type: Boolean,
      default: false,
    },
    noGlow: {
      type: Boolean,
      default: false,
    },
    loading: {
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
      set(val: any) {
        if (val !== this.modelValue) {
          this.$emit('update:model-value', val);
        }
      },
    },
  },
  methods: {
    handleClick() {
      if (!this.disabled) this.ownModelValue = !this.ownModelValue;
    },
  },
});
</script>

<style lang="scss" scoped>
.TaskCheckbox {
  --local-border-color: var(--local-sub-text-color);

  position: relative;
  cursor: pointer;
  width: var(--task-checkbox-size);
  height: var(--task-checkbox-size);

  &.disabled {
    cursor: default;
  }

  &.rounded {
    .TaskCheckbox-input-visible {
      border-radius: 999px;
    }
  }

  &.no-glow {
    .TaskCheckbox-input-visible.selected {
      box-shadow: none;
    }
  }
  &.selected {
    .TaskCheckbox-input-visible {
      --local-border-color: var(--task-checkbox-color);
      background-color: var(--task-checkbox-color);
      box-shadow: 0px 0px 4px 0px var(--task-checkbox-color);
    }

    .TaskCheckbox-input-visible-inner {
      opacity: 1;
      color: var(--local-text-color);
    }
  }

  &:not(.disabled):not(.selected):hover {
    .TaskCheckbox-input-visible-inner {
      opacity: 1;
      color: var(--local-border-color);
    }
  }

  &.loading {
  }
}
.TaskCheckbox-input-invisible {
  opacity: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  position: absolute;

  &:focus {
    & + .TaskCheckbox-input-visible {
      outline: 2px solid green;
      outline-offset: 2px;
    }
  }
}
.TaskCheckbox-input-visible {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 100%;
  border: 2px solid var(--local-border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.05s;

  .TaskCheckbox-input-visible-inner {
    transition: all 0.1s;
    opacity: 0;
    line-height: 1;
    font-size: calc(var(--task-checkbox-size) - 4px);
  }
}
.TaskCheckbox-input-visible-loader {
  position: absolute;
  opacity: 0.5;
  font-size: 14px;
}
</style>
