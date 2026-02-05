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
      <imc-editor-toolbar-button
        v-for="option of options"
        :key="option.value"
        class="ImcEditorToolbarFormatOptionsButton-dropdown-item"
        :icon="option.icon"
        :is-active="isFormatActive(option.value)"
        :title="$t('imcEditor.tools.' + tool.name + '-' + option.value)"
        :expanded="true"
        @click="applyFormat(option.value)"
      ></imc-editor-toolbar-button>
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
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';
import type Quill from 'quill';
import MenuButton from '../../Common/MenuButton.vue';
import {
  NUMERIC_LIST_REGEXP,
  quillGetBlotDelta,
  quillGetDeltaPlainText,
} from '../utils';

type ListType = 'ordered' | 'bullet';

export type ImcEditorToolbarFormatOption = {
  value: ListType;
  icon: string;
};

export default defineComponent({
  name: 'ImcEditorToolbarFormatOptionsButton',
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
  },
  emits: ['used'],
  data() {
    return {
      activeValue: null as null | ListType,
      dropdownShown: false,
    };
  },
  computed: {
    options(): ImcEditorToolbarFormatOption[] {
      return [
        { icon: 'ri-list-ordered', value: 'ordered' },
        { icon: 'ri-list-unordered', value: 'bullet' },
      ];
    },
    activeIcon() {
      const option = this.options.find((opt) => opt.value === this.activeValue);
      return option ? option.icon : null;
    },
    activeValueComp() {
      return this.getActiveValue();
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
    isFormatActive(value: ListType) {
      return this.activeValue === value;
    },
    applyFormat(value: ListType | null) {
      this.dropdownShown = false;

      const reset_bullet = () => {
        this.quill.format('list', false);
      };
      const reset_ordered = () => {
        const lines = this.quill.getLines(
          this.selection?.index,
          this.selection?.length,
        );
        for (const line of lines) {
          const line_delta = quillGetBlotDelta(line);
          const line_str = quillGetDeltaPlainText(line_delta);
          const match = line_str.match(NUMERIC_LIST_REGEXP);
          if (match) {
            line.deleteAt(0, match[0].length);
          }
        }
      };

      if (value === 'ordered') {
        reset_bullet();
        reset_ordered();
        const lines = this.quill.getLines(
          this.selection?.index,
          this.selection?.length,
        );
        if (lines.length > 0) {
          const prev_line = lines[0].prev;
          const prev_line_delta = prev_line
            ? quillGetBlotDelta(prev_line)
            : null;
          const prev_line_str = prev_line_delta
            ? quillGetDeltaPlainText(prev_line_delta)
            : null;
          const prev_line_match = (prev_line_str
            ? prev_line_str.match(NUMERIC_LIST_REGEXP)
            : null) ?? ['', '', '', '0', '.', '\t'];

          const generate_next_insert = (val: string) => {
            return (
              prev_line_match[1] +
              val +
              prev_line_match[4] +
              (prev_line_match[5].length > 1 &&
              val.length > prev_line_match[3].length
                ? prev_line_match[5].substring(1)
                : prev_line_match[5])
            );
          };
          const generate_next_val = (val: string) => {
            if (val.length === 1 && /^[a-zа-ю]$/i.test(val)) {
              return String.fromCharCode(val.charCodeAt(0) + 1);
            } else {
              return (parseInt(val) + 1).toString();
            }
          };

          let next_val = generate_next_val(prev_line_match[3]);
          for (const line of lines) {
            line.insertAt(0, generate_next_insert(next_val));
            next_val = generate_next_val(next_val);
          }
        }
      } else if (value === 'bullet') {
        reset_ordered();
        this.quill.format('list', 'bullet');
      } else {
        reset_bullet();
        reset_ordered();
      }
      this.$emit('used');
    },
    getActiveValue(): ListType | null {
      if (!this.selection) return null;

      const format = this.quill.getFormat(this.selection ?? undefined);
      if (format['list'] === 'ordered' || format['list'] === 'bullet') {
        return format['list'];
      }

      const lines = this.quill.getLines(
        this.selection?.index,
        this.selection?.length,
      );
      for (const line of lines) {
        const line_delta = quillGetBlotDelta(line);
        const line_str = quillGetDeltaPlainText(line_delta);
        if (NUMERIC_LIST_REGEXP.test(line_str)) {
          return 'ordered';
        }
      }

      return null;
    },
    resetFormat() {
      this.applyFormat(null);
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
