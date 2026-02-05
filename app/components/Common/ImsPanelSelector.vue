<template>
  <div class="ImsPanelSelector use-buttons-panel-selector">
    <div
      v-for="option in options"
      :key="option[valueProp]"
      class="ImsPanelSelector-item is-button"
      :class="{
        selected: isOptionSelected(option),
        disabled: busy,
        'ImsPanelSelector-item-danger': option.danger,
      }"
      @click="busy ? {} : selectOption(option)"
    >
      <div class="ImsPanelSelector-item-content-wrapper">
        <slot name="option-icon">
          <i
            v-if="getIconClass(option)"
            :class="[getIconClass(option), 'ImsPanelSelector-item-icon']"
          ></i>
        </slot>
        <slot name="option-text" :option="option">
          <div class="ImsPanelSelector-item-content">
            <div class="ImsPanelSelector-item-content-text">
              <div
                v-if="getLabel(option)"
                class="ImsPanelSelector-item-content-text-label"
              >
                {{ getLabel(option) }}
              </div>
              <div
                v-if="getCaption(option)"
                class="ImsPanelSelector-item-content-text-caption"
              >
                {{ getCaption(option) }}
              </div>
            </div>
            <slot name="option-extra-content" :option="option"></slot>
          </div>
        </slot>
      </div>
      <div class="ImsPanelSelector-item-input-wrapper">
        <input
          v-model="ownModelValue"
          :type="selectionMode === 'single' ? 'radio' : 'checkbox'"
          :value="option[valueProp]"
          name="choose"
          class="ImsPanelSelector-item-input"
        />
        <div class="ImsPanelSelector-item-input-fake" :class="selectionMode">
          <div class="ImsPanelSelector-item-input-fake-inner">
            <i v-if="selectionMode === 'multiple'" class="ri-check-line"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';
import { getIconClass } from '../utils/ui';

export default defineComponent({
  name: 'ImsPanelSelector',
  props: {
    options: {
      type: Array as PropType<any[]>,
      required: true,
    },
    labelProp: {
      type: String as PropType<string>,
      default: 'label',
    },
    valueProp: {
      type: String,
      default: 'value',
    },
    captionProp: {
      type: String,
      default: 'caption',
    },
    iconProp: {
      type: String,
      default: 'icon',
    },
    selectionMode: {
      type: String as PropType<'single' | 'multiple'>,
      default: 'single',
    },
    getOptionLabel: {
      type: Function,
      default: undefined,
    },
    getOptionCaption: {
      type: Function,
      default: undefined,
    },
    nullable: {
      type: Boolean,
      default: true,
    },
    modelValue: {
      type: [String, Number, Array],
      default: null,
    },
    busy: {
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
        if (!this.nullable && Array.isArray(val) && !val.length) return;
        this.$emit('update:model-value', val);
      },
    },
  },
  mounted() {
    if (
      this.selectionMode === 'multiple' &&
      Array.isArray(this.ownModelValue) &&
      !this.nullable
    ) {
      this.ownModelValue = [this.options[0][this.valueProp]];
    }
  },
  methods: {
    selectOption(option: any) {
      if (this.selectionMode === 'single') {
        this.ownModelValue = option[this.valueProp];
      } else if (
        this.selectionMode === 'multiple' &&
        Array.isArray(this.ownModelValue)
      ) {
        const existing_index = this.ownModelValue.indexOf(
          option[this.valueProp],
        );
        if (existing_index === -1) {
          this.ownModelValue = [...this.ownModelValue, option[this.valueProp]];
        } else {
          this.ownModelValue = this.ownModelValue.filter(
            (val: any) => val !== option[this.valueProp],
          );
        }
      }
    },
    isOptionSelected(option: any) {
      if (this.selectionMode === 'single') {
        return this.ownModelValue === option[this.valueProp];
      } else if (this.selectionMode === 'multiple') {
        if (!Array.isArray(this.ownModelValue)) return;
        return this.ownModelValue.includes(option[this.valueProp]);
      }
    },
    getIconClass(option: any) {
      if (!option[this.iconProp]) return;
      return getIconClass(option[this.iconProp], 'dropdown-icon-');
    },
    getCaption(option: any) {
      return this.getOptionCaption
        ? this.getOptionCaption(option)
        : option[this.captionProp];
    },
    getLabel(option: any) {
      return this.getOptionLabel
        ? this.getOptionLabel(option)
        : option[this.labelProp];
    },
  },
});
</script>
<style lang="scss" scoped>
.ImsPanelSelector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 100%;
}

.ImsPanelSelector-item {
  &:not(.selected) {
    --radio-button-color: var(--button-text-color);

    .ImsPanelSelector-item-input-fake {
      background-color: transparent;
    }

    .ImsPanelSelector-item-input-fake-inner {
      display: none;
    }
  }

  &.selected {
    --radio-button-color: var(--button-accent-color);

    .ImsPanelSelector-item-input-fake {
      &.multiple {
        background-color: var(--button-accent-color);
      }
    }
  }
  &.disabled {
    cursor: no-drop;
    &:hover {
      --button-bg-color: inherit;
    }
  }
  &.selected.ImsPanelSelector-item-danger,
  &:hover.ImsPanelSelector-item-danger {
    --radio-button-color: var(--button-text-color-danger);
    --button-border-color: var(--button-text-color-danger);

    .ImsPanelSelector-item-input-fake {
      &.multiple {
        background-color: var(--button-text-color-danger);
      }
    }
  }
}

.ImsPanelSelector-item-content-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ImsPanelSelector-item-icon {
  --button-font-size: 20px;
  font-size: var(--button-font-size);
  line-height: var(--button-font-size);
}

.ImsPanelSelector-item-content {
  display: flex;
  flex-direction: column;
}

.ImsPanelSelector-item-content-text {
  display: flex;
  flex-direction: column;
  gap: 5px;

  .ImsPanelSelector-item-content-text-label {
    font-size: var(--local-font-size);
    font-weight: 500;
  }

  .ImsPanelSelector-item-content-text-caption {
    font-size: 12px;
  }
}

.ImsPanelSelector-item-input-wrapper {
  position: relative;

  .ImsPanelSelector-item-input {
    opacity: 0;
    pointer-events: none;

    &:focus {
      & + .ImsPanelSelector-item-input-fake {
        outline: 2px solid var(--button-accent-color);
        outline-offset: 2px;
      }
    }
  }

  .ImsPanelSelector-item-input-fake {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 15px;
    border: 2px solid var(--radio-button-color);
    display: flex;
    align-items: center;
    justify-content: center;

    &.single {
      border-radius: 999px;

      .ImsPanelSelector-item-input-fake-inner {
        border-radius: 999px;
        width: 7px;
        height: 7px;
      }
    }
    &.multiple {
      border-radius: 4px;
    }

    .ImsPanelSelector-item-input-fake-inner {
      width: 7px;
      height: 7px;
      background-color: var(--radio-button-color);
      position: relative;

      i {
        position: absolute;
        color: var(--local-bg-color);
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-weight: bold;
        font-size: 12px;
        line-height: 12px;
      }
    }
  }
}
</style>
