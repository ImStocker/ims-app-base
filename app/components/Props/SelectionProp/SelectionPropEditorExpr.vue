<template>
  <span
class="SelectionPropEditorExpr" :class="className"
    ><template v-for="(p, i) of display"
:key="i"
      ><selection-prop-editor-expr
        v-if="p.expr"
        :expr="p.expr"
        :source="source"
        :location="p.expr.location ?? null"
        :class="p.class"
      ></selection-prop-editor-expr
      ><span v-else :class="p.class">{{ p.text }}</span></template
    ></span
  >
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type {
  ExprLocation,
  FilterExpr,
} from '../../../logic/expression/filter/filterParser';

type DisplayPortion = {
  expr?: FilterExpr;
  class?: string;
  text?: string;
};

type DisplaySchema = {
  expr?: FilterExpr;
  class?: string;
};

export default defineComponent({
  name: 'SelectionPropEditorExpr',
  // inject: ['projectContext'],
  props: {
    source: {
      type: String,
      required: true,
    },
    location: {
      type: [Object, null] as PropType<ExprLocation | null>,
      default: null,
    },
    expr: {
      type: Object as PropType<FilterExpr>,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    className() {
      if (this.expr === null) return '';
      else {
        const classes = {
          ['type-' + this.expr.type]: true,
        };
        if (this.expr.type === 'const') {
          classes['type-const-kind-' + this.expr.kind] = true;
        }
        return classes;
      }
    },
    displaySchema(): DisplaySchema[] {
      if (this.expr && typeof this.expr === 'object') {
        switch (this.expr.type) {
          case 'filter':
            return [{ expr: this.expr.value, class: 'is-value' }];
          case 'group':
            return [{ expr: this.expr.target }];
          case 'and':
          case 'or':
            return [
              { expr: this.expr.left },
              { class: 'is-operand' },
              { expr: this.expr.right },
            ];
          case 'not':
            return [{ class: 'is-operand' }, { expr: this.expr.target }];
          case 'range':
            return [{ expr: this.expr.start }, { expr: this.expr.end }];
        }
      }
      return [];
    },
    display(): DisplayPortion[] {
      let current_start = this.location ? this.location.start.offset : 0;
      const end_pos = this.location
        ? this.location.end.offset
        : this.source.length;
      const res: DisplayPortion[] = [];
      let current_class: string | undefined = undefined;
      for (let p = 0; p < this.displaySchema.length; p++) {
        const schema = this.displaySchema[p];
        if (schema.expr && schema.expr.location) {
          if (current_start < schema.expr.location.start.offset) {
            res.push({
              text: this.source.substring(
                current_start,
                schema.expr.location.start.offset,
              ),
              class: current_class,
            });
          }
          res.push({
            expr: schema.expr,
            class: schema.class,
          });
          current_start = schema.expr.location.end.offset;
        }
        current_class = schema.class;
      }
      if (current_start < end_pos) {
        res.push({
          text: this.source.substring(current_start, end_pos),
        });
      }
      return res;
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectionPropEditorExpr.type-and,
.SelectionPropEditorExpr.type-or,
.SelectionPropEditorExpr.type-not {
  & > .is-operand {
    color: #8250df;
  }
}
.SelectionPropEditorExpr.type-filter {
  & > .is-value {
    background-color: #ddf4ff;
    color: #0969da;
    border-radius: 4px;
  }
}
.SelectionPropEditorExpr.type-filter
  .SelectionPropEditorExpr.type-const-kind-uuid,
.SelectionPropEditorExpr.type-const-kind-uuid {
  background-color: #ddffe0;
  color: #077117;
  border-radius: 4px;
}
</style>
