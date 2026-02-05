<template>
  <imc-editor-toolbar-button
    class="ImcEditorToolbarFormatButton"
    :icon="tool.icon"
    :is-active="isActive"
    :title="$t('imcEditor.tools.' + tool.name)"
    :expanded="expanded"
    @click="click"
  ></imc-editor-toolbar-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';
import type Quill from 'quill';

export default defineComponent({
  name: 'ImcEditorToolbarFormatButton',
  components: {
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
    formatValue: { type: [String, Number, Boolean], default: true },
  },
  emits: ['used'],
  data() {
    return {
      isActive: false,
    };
  },
  computed: {
    isActiveComp() {
      return this.getIsActive();
    },
  },
  watch: {
    isActiveComp(val) {
      this.isActive = val;
    },
    changeEpoch() {
      this.isActive = this.getIsActive();
    },
  },
  mounted() {
    this.isActive = this.getIsActive();
  },
  methods: {
    getIsActive(): boolean {
      if (!this.selection) return false;

      const format = this.quill.getFormat(this.selection ?? undefined);
      if (this.formatValue === true) {
        return !!format[this.format];
      } else {
        return format[this.format] === this.formatValue;
      }
    },
    click() {
      this.quill.format(this.format, this.isActive ? false : this.formatValue);
      this.$emit('used');
    },
  },
});
</script>

<style lang="scss" scoped></style>
