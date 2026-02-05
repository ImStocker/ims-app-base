<template>
  <menu-button v-model:shown="dropdownShown" class="ColorPropEditor is-button">
    <template #button="{ toggle }">
      <div class="ColorPropEditor-content" @click="toggle">
        <div
          class="ColorPropEditor-button"
          :style="{
            'background-color': taskColor,
          }"
          :disabled="isGuest"
        ></div>
        <div v-if="!isGuest">{{ $t('common.dialogs.select') }}...</div>
      </div>
    </template>
    <select-task-marker-dropdown-content
      :value="selectedValue"
      @input="onSelected($event)"
    ></select-task-marker-dropdown-content>
  </menu-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { getTaskColorValue } from '../../logic/utils/tasks';
import MenuButton from '../Common/MenuButton.vue';
import type { AssetPropValue } from '../../logic/types/Props';
import SelectTaskMarkerDropdownContent from '../Tasks/SelectTaskMarkerDropdownContent.vue';
import ProjectManager from '../../logic/managers/ProjectManager';

export default defineComponent({
  name: 'ColorPropEditor',
  components: {
    MenuButton,
    SelectTaskMarkerDropdownContent,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  computed: {
    taskColor() {
      return getTaskColorValue(this.modelValue as string | null);
    },
    selectedValue: {
      get(): string | undefined {
        return (this.modelValue as string | undefined) ?? undefined;
      },
      set(val: string | undefined) {
        this.$emit('update:modelValue', val ?? null);
      },
    },
    isGuest() {
      return !this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  methods: {
    onSelected(val?: string) {
      this.dropdownShown = false;
      this.selectedValue = val;
    },
    getTaskColorValue,
  },
});
</script>

<style lang="scss" scoped>
.ColorPropEditor-button {
  --button-font-size: 15px;
  width: 15px;
  height: 15px;
  border: 1px solid var(--root-border-color);
  border-radius: 5px;
}
.ColorPropEditor-content {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 15px;
}
</style>
