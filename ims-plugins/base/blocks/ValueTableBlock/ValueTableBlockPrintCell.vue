<template>
  <div class="ValueTableBlockPrintCell">
    <props-block-value-stack
      :form-state="tableData.values"
      :field="column"
      :block-id="resolvedBlock.id"
    ></props-block-value-stack>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetRights } from '#logic/types/Rights';
import type { ResolvedAssetBlock } from '#logic/utils/assets';
import type {
  ValueTableBlockColumn,
  ValueTableBlockData,
  ValueTableBlockRowData,
} from './ValueTableBlock';
import PropsBlockValueStack from '../PropsBlock/PropsBlockValueStack.vue';
import { normalizeAssetPropPart } from '#logic/types/Props';
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
  name: 'ValueTableBlockPrintCell',
  components: {
    PropsBlockValueStack,
  },
  props: {
    rights: {
      type: Number as PropType<AssetRights>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    row: {
      type: Object as PropType<ValueTableBlockRowData>,
      required: true,
    },
    tableData: {
      type: Object as PropType<ValueTableBlockData>,
      required: true,
    },
    column: {
      type: Object as PropType<ValueTableBlockColumn>,
      required: true,
    },
  },
  emits: ['save', 'discard', 'row-primary-changed'],
  data() {
    return {};
  },
  computed: {
    primaryValue() {
      const val =
        this.tableData.values.combined[
          `${this.row.id}\\values\\${this.tableData.primary}`
        ];
      return val !== undefined ? val : this.row.id;
    },
  },
  watch: {},
  unmounted() {},
  methods: {
    validatePrimaryValue(val: string) {
      if (!val) return null;
      const new_id = normalizeAssetPropPart(val);
      if (this.tableData.usedRowIds.has(new_id)) {
        return this.$t('assetEditor.tableBlockRowPrimartyKeyAlreadyUsed');
      }
      return null;
    },
    setPrimaryValue(val: string) {
      if (this.validatePrimaryValue(val) !== null) {
        return;
      }
      let new_id = val ? normalizeAssetPropPart(val) : uuidv4();
      new_id = new_id.replace(/^_{2,}/, '_');
      const old_id = this.row.id;

      this.$emit('row-primary-changed', {
        old: old_id,
        new: new_id,
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
