<template>
  <div class="ValueTableBlockRowCell">
    <props-block-value-stack
      v-if="column.name !== tableData.primary"
      :form-state="tableData.values"
      :edit-mode="editMode"
      :field="column"
      :block-id="resolvedBlock.id"
      :asset-changer="assetChanger"
    ></props-block-value-stack>
    <props-block-prop
      v-else
      :edit-mode="editMode"
      :computed-state="true"
      :same-value="true"
      :model-value="primaryValue"
      :validate-value="validatePrimaryValue"
      @update:model-value="setPrimaryValue($event)"
    ></props-block-prop>
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
import PropsBlockProp from '../PropsBlock/PropsBlockProp.vue';
import {
  makeBlockRef,
  normalizeAssetPropPart,
} from '#logic/types/Props';
import { v4 as uuidv4 } from 'uuid';
import type { AssetChanger } from '#logic/types/AssetChanger';

export default defineComponent({
  name: 'ValueTableBlockRowCell',
  components: {
    PropsBlockValueStack,
    PropsBlockProp,
  },
  props: {
    editMode: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
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

      let new_row_val: string | number | null = val;
      if (!val) new_row_val = null;
      else if (/^\d+$/.test(val)) new_row_val = parseInt(val);

      const op = this.assetChanger.makeOpId();
      this.assetChanger.renameBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        old_id,
        new_id,
        op,
      );
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `${new_id}\\values\\${this.tableData.primary}`,
        new_row_val,
        op,
      );
      this.$emit('row-primary-changed', {
        old: old_id,
        new: new_id,
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
