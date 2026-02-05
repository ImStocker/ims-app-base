<template>
  <div class="SelectWorkspaceComboBox">
    <menu-button
      v-model:shown="dropdownShown"
      class="SelectWorkspaceComboBox-menu"
    >
      <template #button="{ toggle }">
        <slot
          name="override-button"
          :toggle="toggle"
          :dropdown-shown="dropdownShown"
        >
          <button
            class="is-input SelectWorkspaceComboBox-menu-button"
            :class="{ focus: dropdownShown }"
            :disabled="readonly"
            @click="readonly ? null : toggle()"
          >
            <div class="SelectWorkspaceComboBox-menu-label">
              <caption-string
                class="SelectWorkspaceComboBox-menu-parentTitle"
                :value="modelValue?.title ?? placeholder"
              >
              </caption-string>
            </div>
            <template v-if="!readonly">
              <i
                v-if="modelValue && clearable"
                class="asset-icon-close-line SelectWorkspaceComboBox-menu-icon-clear"
                @click.stop="clear"
              ></i>
              <i
                v-else
                class="ri-arrow-down-s-line SelectWorkspaceComboBox-menu-icon"
                :class="{ 'state-open': dropdownShown }"
              ></i>
            </template>
          </button>
        </slot>
      </template>
      <select-workspace-list-box
        :model-value="modelValue"
        :readonly="readonly"
        :where="where"
        class="is-dropdown SelectWorkspaceComboBox-dropdown"
        @update:model-value="onSelected($event)"
      ></select-workspace-list-box>
    </menu-button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import CaptionString from '../Common/CaptionString.vue';
import MenuButton from '../Common/MenuButton.vue';
import type { WorkspaceForSelection } from '../../logic/types/AssetsType';
import type { WorkspaceQueryDTOWhere } from '../../logic/types/Workspaces';
import SelectWorkspaceListBox from './SelectWorkspaceListBox.vue';

export default defineComponent({
  name: 'SelectWorkspaceComboBox',
  components: {
    CaptionString,
    MenuButton,
    SelectWorkspaceListBox,
  },
  props: {
    modelValue: {
      type: Object as PropType<WorkspaceForSelection | null>,
      required: false,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    where: {
      type: Object as PropType<WorkspaceQueryDTOWhere | null>,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  methods: {
    changeValue(ev: WorkspaceForSelection | null) {
      this.$emit('update:modelValue', ev);
    },
    onSelected(item: WorkspaceForSelection) {
      this.changeValue(item);
      this.dropdownShown = false;
    },
    clear() {
      this.changeValue(null);
      this.dropdownShown = false;
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

.SelectWorkspaceComboBox {
  width: 100%;
  min-width: 100px;
}

.SelectWorkspaceComboBox-menu-button {
  display: flex;
  width: 100%;
}

.SelectWorkspaceComboBox-menu-label {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 23px;
  gap: 5px;
  min-width: 0;
}

.SelectWorkspaceComboBox-menu-label-disabled {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
  display: flex;
  gap: 5px;
}

.SelectWorkspaceComboBox-menu-icon-parent {
  @include asset-icons.asset-icons;
}

.SelectWorkspaceComboBox-menu-parentTitle {
  text-transform: none;
  overflow: hidden;
  text-overflow: ellipsis;
}

.SelectWorkspaceComboBox-menu-icon {
  transition: transform 0.2s;

  &.state-open {
    transform: rotate(180deg);
  }
}

.SelectWorkspaceComboBox-menu-icon-clear {
  cursor: pointer;
  @include asset-icons.asset-icons;
}

.SelectWorkspaceComboBox-dropdown {
  padding: var(--dropdown-padding);
  min-width: var(--DropdownContainer-attachToElement-width);
  --SelectWorkspaceListBox-itemsHeight: 250px;
}
</style>
