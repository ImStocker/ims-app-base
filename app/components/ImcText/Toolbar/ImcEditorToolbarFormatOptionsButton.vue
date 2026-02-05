<template>
  <menu-button v-model:shown="dropdownShown">
    <template #button="{ toggle }">
      <imc-editor-toolbar-button
        class="ImcEditorToolbarFormatOptionsButton"
        :icon="activeIcon ?? tool.icon"
        :is-active="!!activeValue"
        :title="$t('imcEditor.tools.' + tool.name)"
        :expanded="expanded"
        @click="toggle"
      ></imc-editor-toolbar-button>
    </template>
    <div class="ImcEditorToolbarFormatOptionsButton-dropdown">
      <imc-editor-toolbar-format-button
        v-for="optionExt of optionsExts"
        :key="optionExt.value"
        :quill="quill"
        :tool="optionExt.tool"
        :format="format"
        :format-value="optionExt.value"
        :expanded="true"
        :change-epoch="changeEpoch"
        :selection="selection"
        class="ImcEditorToolbarFormatOptionsButton-dropdown-item"
        @used="optionUsed"
      ></imc-editor-toolbar-format-button>
      <imc-editor-toolbar-button
        v-if="activeValue"
        class="ImcEditorToolbarFormatOptionsButton-dropdown-item"
        icon="ri-close-fill"
        :title="$t('imcEditor.resetFormat')"
        :expanded="true"
        @click="resetFormat"
      ></imc-editor-toolbar-button>
    </div>
  </menu-button>
</template>

<script lang="ts">
import { defineComponent, markRaw, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';
import type Quill from 'quill';
import ImcEditorToolbarFormatButton from './ImcEditorToolbarFormatButton.vue';
import MenuButton from '../../Common/MenuButton.vue';

export type ImcEditorToolbarFormatOption = {
  value: string;
  icon: string;
};

export default defineComponent({
  name: 'ImcEditorToolbarFormatOptionsButton',
  components: {
    MenuButton,
    ImcEditorToolbarButton,
    ImcEditorToolbarFormatButton,
  },
  props: {
    quill: { type: Object as PropType<Quill>, required: true },
    tool: { type: Object as PropType<ImcToolbarTool>, required: true },
    selection: {
      type: [Object, null] as PropType<{
        index: number;
        length: number;
      } | null>,
      required: true,
    },
    expanded: { type: Boolean, default: false },
    changeEpoch: { type: Number, default: 0 },
    format: { type: String, required: true },
    options: { type: Array<ImcEditorToolbarFormatOption>, required: true },
  },
  emits: ['used'],
  data() {
    return {
      activeValue: null as null | string,
      dropdownShown: false,
    };
  },
  computed: {
    activeIcon() {
      const option = this.options.find((opt) => opt.value === this.activeValue);
      return option ? option.icon : null;
    },
    activeValueComp() {
      return this.getActiveValue();
    },
    optionsExts(): { value: string; tool: ImcToolbarTool }[] {
      return this.options.map((option) => {
        return {
          value: option.value,
          tool: {
            name: this.tool.name + '-' + option.value,
            component: markRaw(ImcEditorToolbarFormatButton),
            icon: option.icon,
            main: this.tool.main,
            section: this.tool.section,
          },
        };
      });
    },
  },
  watch: {
    activeValueComp(val) {
      this.activeValue = val;
    },
    changeEpoch() {
      this.activeValue = this.getActiveValue();
    },
  },
  mounted() {
    this.activeValue = this.getActiveValue();
  },
  methods: {
    getActiveValue(): string | null {
      if (!this.selection) return null;
      const format = this.quill.getFormat(this.selection ?? undefined);
      return format[this.format] as string;
    },
    resetFormat() {
      this.quill.format(this.format, false);
    },
    optionUsed() {
      this.dropdownShown = false;
      this.$emit('used');
    },
  },
});
</script>

<style lang="scss" scoped>
@use './ImcEditorToolbar.scss';

.ImcEditorToolbarFormatOptionsButton-dropdown {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown;

  &:deep(.is-button-toolbar) {
    @include ImcEditorToolbar.ImcEditorToolbar-button;
  }
}
.ImcEditorToolbarFormatOptionsButton-dropdown-item {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown-item;
}
</style>
