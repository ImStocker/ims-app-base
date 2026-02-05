<template>
  <table class="PropsBlockSheetPrint">
    <tbody>
      <tr v-for="ent of formDef.fields" :key="ent.propKey">
        <th width="150">
          {{ convertTranslatedTitle(ent.propTitle) }}
        </th>
        <td>
          <props-block-value-stack
            :form-state="formState"
            :edit-mode="false"
            class="AssetEditorPropsBlock_Sheet-cell type-value"
            :field="ent"
            display-mode="print"
          ></props-block-value-stack>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { convertTranslatedTitle } from '#logic/utils/assets';
import PropsBlockValueStack from './PropsBlockValueStack.vue';
import type {
  PropsFormDef,
  PropsFormState,
} from '#logic/types/PropsForm';

export default defineComponent({
  name: 'PropsBlockSheetPrint',
  components: {
    PropsBlockValueStack,
  },
  props: {
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    formDef: {
      type: Object as PropType<PropsFormDef>,
      required: true,
    },
  },
  emits: [],
  data() {
    return {
      entryRefs: {
        prop: new Map<string, any>(),
        value: new Map<string, any>(),
      },
      hoverProp: null as {
        element: HTMLElement;
        propKey: string;
      } | null,
      shownDropdownMenuIdx: null as number | null,
    };
  },
  computed: {},
  methods: {
    convertTranslatedTitle(title: string) {
      return convertTranslatedTitle(title, (...args) => this.$t(...args));
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.PropsBlockSheetPrint {
  --table-border: #666666;
  border-collapse: collapse;
  border: 1px solid var(--table-border);
  width: 100%;

  thead,
  tbody,
  td,
  th {
    border-collapse: collapse;
    border: 1px solid var(--table-border);
  }
}
</style>
