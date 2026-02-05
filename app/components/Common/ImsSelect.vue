<template>
  <div class="is-select ImsSelect">
    <v-select
      ref="select"
      v-model="ownModelValue"
      :append-to-body="true"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      :get-option-key="getOptionKey"
      :get-option-label="getOptionLabel"
      :label="labelProp"
      :options="options"
      :reduce="reduce"
      :taggable="taggable"
      :calculate-position="calculatePosition"
      :uid="vueSelectInputId"
      @open="dropdownShown = true"
      @close="dropdownShown = false"
    >
      <template #no-options>
        <slot name="no-options">
          <div class="ImcSelect-no-options">
            {{ $t('common.controls.noMatchingOptions') }}
          </div>
        </slot>
      </template>
      <template #open-indicator="{ attributes }">
        <slot name="open-indicator" :attributes="attributes">
          <i
            v-bind="attributes as any"
            class="ri-arrow-down-s-line ImsSelect-icon"
          ></i>
        </slot>
      </template>
      <template #option="option">
        <slot name="option" :option="option">
          <button
            v-if="option && (getOptionLabel || labelProp)"
            class="is-button is-button-dropdown-item"
          >
            <slot name="option-content" :option="option">
              {{
                option !== null
                  ? getOptionLabel
                    ? getOptionLabel(option)
                    : option[labelProp]
                  : ''
              }}</slot
            >
          </button>
        </slot>
      </template>
      <template #selected-option="option">
        <slot name="selected-option" :option="option">
          <slot name="option-content" :option="option">
            {{
              option !== null
                ? getOptionLabel
                  ? getOptionLabel(option)
                  : option[labelProp]
                : ''
            }}
          </slot>
        </slot>
      </template>
      <template #list-footer>
        <slot name="list-footer"></slot>
      </template>
      <!-- <template #default-option="option">
        <slot name="default-option" :option="option">
          <button
            v-if="option && (getOptionLabel || labelProp)"
            class="is-button is-button-dropdown-item"
          >
            {{ getOptionLabel ? getOptionLabel(option) : option[labelProp] }}
          </button>
        </slot>
      </template> -->
    </v-select>
    <dropdown-container v-if="dropdownShown" ref="dropdownContainer">
      <div
        ref="dropdownContainerInner"
        class="ImsSelect-dropdownContainer-inner"
      ></div>
    </dropdown-container>
  </div>
</template>
<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type Component, type PropType } from 'vue';
import vSelect from 'vue-select';
import DropdownContainer from './DropdownContainer.vue';
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
  name: 'ImsSelect',
  components: {
    vSelect,
    DropdownContainer,
  },
  props: {
    modelValue: {
      type: [Object, String, Number] as PropType<any>,
      default: null,
    },
    placeholder: {
      type: String,
      default: null,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    getOptionKey: {
      type: Function,
      default: undefined,
    },
    getOptionLabel: {
      type: Function,
      default: undefined,
    },
    getEmptyOptionKey: {
      type: Function,
      default: undefined,
    },
    labelProp: {
      type: String,
      default: null,
    },
    options: {
      type: Array,
      default: () => [],
    },
    reduce: {
      type: Function,
      default: undefined,
    },
    taggable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:model-value'],
  data() {
    return {
      dropdownShown: false,
      vueSelectInputId: 'ssr',
    };
  },
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: any) {
        this.$emit('update:model-value', val);
      },
    },
  },
  mounted() {
    this.vueSelectInputId = uuidv4();
  },
  methods: {
    openDropdown() {
      const vSelect = this.$refs.select;
      if ((vSelect as any).selectedValue) {
        if ((vSelect as any).selectedValue.length > 0) {
          return;
        }
      }
      if (vSelect) {
        (vSelect as any).open = true;
      }
    },
    calculatePosition(
      dropdownList: HTMLUListElement,
      _component: Component,
      _params: { width: string; top: string; left: string },
    ) {
      dropdownList.style.display = 'none';
      this.$nextTick(() => {
        if (!this.$refs.dropdownContainerInner) {
          return;
        }
        (this.$refs.dropdownContainerInner as any).appendChild(dropdownList);
        dropdownList.style.display = '';
      });
    },
    focus() {
      if (!this.$refs['select']) return;
      if (!(this.$refs['select'] as any).$refs.search) return;
      (this.$refs['select'] as any).$refs.search.focus();
    },
  },
});
</script>
<style lang="scss" scoped>
.ImsSelect {
  max-width: 100%;
}

.ImcSelect-no-options {
  padding: var(--dropdown-padding);
  font-style: italic;
  color: var(--local-sub-text-color);
}

.ImsSelect-icon {
  font-size: var(--input-font-size);
}

.ImsSelect-dropdownContainer-inner {
  width: var(--DropdownContainer-attachToElement-width);
  --vs-controls-color: var(--local-sub-text-color);
  --vs-border-color: var(--local-box-color);

  --vs-dropdown-bg: var(--local-box-color);
  --vs-dropdown-color: var(--local-text-color);
  --vs-dropdown-option-color: var(--local-text-color);

  --vs-selected-bg: transparent;
  --vs-selected-color: var(--local-text-color);

  --vs-search-input-color: var(--text-intense);

  --vs-dropdown-option--active-bg: var(--color-accent);
  --vs-dropdown-option--active-color: var(--local-box-color);
}
</style>
