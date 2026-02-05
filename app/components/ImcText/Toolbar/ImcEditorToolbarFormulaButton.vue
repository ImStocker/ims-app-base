<template>
  <imc-editor-toolbar-button
    class="ImcEditorToolbarFormulaButton"
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
import Delta from 'quill-delta';

export default defineComponent({
  name: 'ImcEditorToolbarFormulaButton',
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

      const content = this.quill.getContents(
        this.selection.index,
        this.selection.length,
      );

      return content.ops.some((op) => op.insert && (op.insert as any).formula);
    },
    click() {
      if (!this.selection) return false;

      const is_active = this.getIsActive();

      let change = new Delta()
        .retain(this.selection.index)
        .delete(this.selection.length);
      if (!is_active) {
        const text = this.quill.getText(
          this.selection.index,
          this.selection.length,
        );
        change = change.insert({
          formula: text,
        });
      } else {
        const content = this.quill.getContents(
          this.selection.index,
          this.selection.length,
        );
        for (const op of content.ops) {
          if (op.insert && (op.insert as any).formula) {
            change.push({
              ...op,
              insert: (op.insert as any).formula,
            });
          } else {
            change.push(op);
          }
        }
      }

      this.quill.updateContents(change);
      this.$emit('used');
    },
  },
});
</script>

<style lang="scss" scoped></style>
