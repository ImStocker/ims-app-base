<template>
  <table class="AssetEditorValueTableBlockPrint">
    <thead>
      <tr>
        <th
          v-for="column of tableData.columns"
          :key="column.name"
          :style="{ width: column.width + 'px' }"
        >
          {{ convertTranslatedTitle(column.propTitle) }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row of tableData.rows" :key="row.id">
        <td
          v-for="column of row.columns"
          :key="column.name"
          :style="{ width: column.width + 'px' }"
        >
          <value-table-block-row-cell
            :key="row.id"
            class="AssetEditorValueTableBlock-rowCell"
            :column="column"
            :edit-mode="false"
            :asset-changer="assetChanger"
            :resolved-block="resolvedBlock"
            :rights="readOnlyRights"
            :row="row"
            :table-data="tableData"
          ></value-table-block-row-cell>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import ValueTableBlockRowCell from './ValueTableBlockRowCell.vue';
import type { ValueTableBlockData } from './ValueTableBlock';
import { AssetRights } from '#logic/types/Rights';
import type { AssetChanger } from '#logic/types/AssetChanger';
import {
  convertTranslatedTitle,
  type ResolvedAssetBlock,
} from '#logic/utils/assets';

export default defineComponent({
  name: 'ValueTableBlockPrint',
  components: {
    ValueTableBlockRowCell,
  },
  provide() {
    return {
      structPropEditorStructIds: [],
    };
  },
  props: {
    tableData: {
      type: Object as PropType<ValueTableBlockData>,
      required: true,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
  },
  computed: {
    readOnlyRights() {
      return AssetRights.READ_ONLY;
    },
  },
  methods: {
    convertTranslatedTitle(title: string) {
      return convertTranslatedTitle(title, (...args) => this.$t(...args));
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorValueTableBlockPrint {
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
