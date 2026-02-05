<template>
  <imc-editor-toolbar-button
    class="ImcEditorToolbarClearFormatButton"
    :icon="tool.icon"
    :title="$t('imcEditor.tools.' + tool.name)"
    :expanded="expanded"
    @click="click"
  ></imc-editor-toolbar-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import type Quill from 'quill';
import Delta from 'quill-delta';
import { QUILL_SCOPE_INLINE, QuillSources } from '../quill-init';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';

export default defineComponent({
  name: 'ImcEditorToolbarClearFormatButton',
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
  },
  emits: ['used'],
  methods: {
    click() {
      const range = this.selection;
      if (!range) return;
      if (range.length === 0) {
        const formats = this.quill.getFormat();
        Object.keys(formats).forEach((name) => {
          // Clean functionality in existing apps only clean inline formats
          if (this.quill.scroll.query(name, QUILL_SCOPE_INLINE) != null) {
            this.quill.format(name, false, QuillSources.USER);
          }
        });
      } else {
        const delta = new Delta().retain(range.index).retain(range.length, {
          bold: false,
          italic: false,
          strike: false,
          underline: false,
          font: false,
          size: false,
          color: false,
          background: false,
          header: false,
          code: false,
          'code-block': false,
          align: false,
          blockquote: false,
        });
        this.quill.updateContents(delta, QuillSources.USER);
      }
      this.$emit('used');
    },
  },
});
</script>

<style lang="scss" scoped></style>
