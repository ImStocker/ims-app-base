<template>
  <menu-button>
    <template #button="{ toggle }">
      <imc-editor-toolbar-button
        class="ImcEditorToolbarFormatColorButton"
        :icon="tool.icon"
        :is-active="!!activeValue"
        :title="$t('imcEditor.tools.' + tool.name)"
        :expanded="expanded"
        :style="buttonStyle"
        @click="toggle"
      ></imc-editor-toolbar-button>
    </template>
    <div class="ImcEditorToolbarFormatColorButton-dropdown">
      <button
        v-for="color of colors"
        :key="color"
        class="ImcEditorToolbarFormatColorButton-color"
        :style="{
          '--ImcEditorToolbarFormatColorButton-color': color
            ? color
            : undefined,
        }"
        @click="setFormat(color)"
      >
        <i
          v-if="color === activeValue || (!color && !activeValue)"
          class="ri-check-fill"
        ></i>
        <i v-else-if="!color" class="ri-close-fill"></i>
      </button>
    </div>
  </menu-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';
import type Quill from 'quill';
import MenuButton from '../../Common/MenuButton.vue';

export type ImcEditorToolbarFormatOption = {
  value: string;
  icon: string;
};

export default defineComponent({
  name: 'ImcEditorToolbarFormatColorButton',
  components: {
    MenuButton,
    ImcEditorToolbarButton,
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
    colors: { type: Array<string>, required: true },
  },
  emits: ['used'],
  data() {
    return {
      activeValue: null as null | string,
    };
  },
  computed: {
    activeValueComp() {
      return this.getActiveValue();
    },
    buttonStyle() {
      if (!this.activeValue) {
        return {};
      }
      return {
        '--ImcEditorToolbar-button-activeColor': this.activeValue,
      };
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
    setFormat(val: string) {
      this.quill.format(this.format, val);
      this.$emit('used');
    },
  },
});
</script>

<style lang="scss" scoped>
@use './ImcEditorToolbar.scss';

.ImcEditorToolbarFormatColorButton-dropdown {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown;
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(7, 1fr);
  padding: 3px;
}
.ImcEditorToolbarFormatColorButton-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background-color: var(--ImcEditorToolbarFormatColorButton-color, transparent);
  padding: 0;
  color: var(--local-text-color);
  line-height: 16px;
  & > i.ri-close-fill {
    opacity: 0.5;
  }
  &:hover {
    outline: 1px solid
      var(--ImcEditorToolbarFormatColorButton-color, transparent);
    & > i.ri-close-fill {
      opacity: 1;
    }
  }
}
</style>
