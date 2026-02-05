<template>
  <div class="SelectionPropEditorTextInput">
    <div
      class="SelectionPropEditorTextInput-frame is-input"
      :title="parsed.error ? parsed.error : parsed.source"
    >
      <div class="SelectionPropEditorTextInput-frame-content">
        <div
          v-if="parsed.result !== null"
          class="SelectionPropEditorTextInput-highlight"
        >
          <selection-prop-editor-expr
            ref="hightlight"
            class="SelectionPropEditorTextInput-highlight-content"
            :expr="parsed.result"
            :source="parsed.source"
          ></selection-prop-editor-expr>
        </div>
        <pre
          v-else-if="parsed.error"
          class="SelectionPropEditorTextInput-highlight type-error"
          >{{ parsed.source }}</pre
        >
        <div v-else class="SelectionPropEditorTextInput-highlight">&nbsp;</div>
        <input
          ref="input"
          v-model="textValue"
          type="text"
          class="SelectionPropEditorTextInput-input"
          :placeholder="placeholder"
        />
      </div>
      <div v-if="$slots.append" class="SelectionPropEditorTextInput-append">
        <slot name="append"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValueSelection } from '../../../logic/types/Props';
import {
  convertFilterExprToPropWhere,
  parseFilterExpression,
} from '../../../logic/expression/filter/filterExpression';
import type { FilterExprStart } from '../../../logic/expression/filter/filterParser';
import SelectionPropEditorExpr from './SelectionPropEditorExpr.vue';

export default defineComponent({
  name: 'SelectionPropEditorInput',
  // inject: ['projectContext'],
  components: {
    SelectionPropEditorExpr,
  },
  props: {
    modelValue: {
      type: [Object, null] as PropType<AssetPropValueSelection | null>,
      default: null,
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  computed: {
    parsed(): {
      result: FilterExprStart | null;
      error: string | null;
      source: string;
    } {
      try {
        return {
          source: this.textValue,
          result: parseFilterExpression(this.textValue, {
            trackLocations: true,
          }),
          error: null,
        };
      } catch (err: any) {
        return {
          source: this.textValue,
          result: null,
          error: err.message,
        };
      }
    },
    textValue: {
      get() {
        return this.modelValue?.Str ?? '';
      },
      set(val: string) {
        try {
          const parsed = val ? parseFilterExpression(val) : null;
          this.$emit('update:modelValue', {
            Str: val,
            Where: parsed ? convertFilterExprToPropWhere(parsed) : {},
          });
        } catch {
          this.$emit('update:modelValue', {
            Str: val,
            Where: {
              query: val,
            },
          });
        }
      },
    },
  },
  watch: {
    textValue() {
      this.updateInputWidth();
    },
  },
  mounted() {
    this.updateInputWidth();
  },
  methods: {
    updateInputWidth() {
      const hightlight = this.$refs['hightlight'] as
        | InstanceType<typeof SelectionPropEditorExpr>
        | undefined;
      const input = this.$refs['input'] as HTMLElement | undefined;
      if (!hightlight || !input) return;
      input.style.minWidth = hightlight.$el.clientWidth + 'px';
    },
    focus() {
      if (!this.$refs.input) return;
      (this.$refs.input as HTMLInputElement).focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectionPropEditorTextInput-input {
  width: 100%;
}
.SelectionPropEditorTextInput-frame {
  display: flex;
}
.SelectionPropEditorTextInput-frame-content {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  flex: 1;
}
.SelectionPropEditorTextInput-highlight {
  white-space: pre;
  position: relative;
  pointer-events: none;
  &.type-error {
    color: var(--color-main-error);
  }
}

.SelectionPropEditorTextInput-highlight-content {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  white-space: pre;
}

.SelectionPropEditorTextInput-highlight,
.SelectionPropEditorTextInput-highlight-content,
.SelectionPropEditorTextInput-input {
  height: 1.7em;
  min-height: 1.7em;
  line-height: 1.7em;
  padding: 0;
  display: block;
  margin: 0;
  font-size: var(--local-font-size);
  font-family: var(--local-font-family);
}

.SelectionPropEditorTextInput-input {
  color: transparent;
  background: none;
  border: none;
  margin-top: -1.7em;
  caret-color: var(--local-text-color);
  position: relative;
  &::placeholder {
    color: var(--input-placeholder-color);
    font-style: var(--input-placeholder-font-style);
    font-weight: var(--input-placeholder-font-weight);
  }
}
</style>
