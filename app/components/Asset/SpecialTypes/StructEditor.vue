<template>
  <div class="StructEditor">
    <sortable-list
      class="StructEditor-items"
      handle-selector=".SomeEditorListItem-drag"
      id-key="propKey"
      :list="structureItems"
      :disabled="readonly"
      @update:list="reorder($event)"
    >
      <template #default="{ item }">
        <struct-editor-item
          class="StructEditor-item"
          :item="item"
          :block="block"
          :asset-changer="assetChanger"
          :structure-items="structureItems"
          :readonly="readonly"
          @delete="deleteElement(item)"
        ></struct-editor-item>
      </template>
    </sortable-list>
    <button
      v-if="!readonly"
      class="is-button is-button-action"
      @click="addElement"
    >
      {{ $t('assetEditor.struct.addElement') }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import type { AssetChanger } from '../../../logic/types/AssetChanger';
import { makeBlockRef } from '../../../logic/types/Props';
import SortableList from '../../Common/SortableList.vue';
import { generateNextUniqueNameNumber } from '../../../logic/utils/stringUtils';
import DialogManager from '../../../logic/managers/DialogManager';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';
import type { PropsFormFieldDef } from '../../../logic/types/PropsForm';
import StructEditorItem from './StructEditorItem.vue';
import { extractStructFormFields } from './StructEditor';

export default defineComponent({
  name: 'StructEditor',
  components: {
    SortableList,
    StructEditorItem,
  },
  props: {
    block: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    structureItems(): PropsFormFieldDef[] {
      return extractStructFormFields(this.block);
    },
  },
  methods: {
    reorder(new_list: PropsFormFieldDef[]) {
      const old_list = [...this.structureItems];
      let diff_start = 0;
      for (; diff_start < new_list.length; diff_start++) {
        if (new_list[diff_start].propKey !== old_list[diff_start].propKey) {
          break;
        }
      }
      let diff_end = new_list.length;
      for (; diff_end > 0; diff_end--) {
        if (new_list[diff_end - 1].propKey !== old_list[diff_end - 1].propKey) {
          break;
        }
      }

      const op_id = this.assetChanger.makeOpId();
      const cur_props = { ...this.block.computed };
      for (let i = diff_start; i < diff_end; i++) {
        for (const [prop, val] of Object.entries(cur_props)) {
          const prop_prefix = `fields\\${new_list[i].index}\\`;
          if (prop.startsWith(prop_prefix)) {
            this.assetChanger.setBlockPropKey(
              this.block.assetId,
              makeBlockRef(this.block),
              null,
              `fields\\${old_list[i].index}\\` +
                prop.substring(prop_prefix.length),
              val,
              op_id,
            );
          }
        }
      }
    },
    async deleteElement(item: PropsFormFieldDef) {
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('assetEditor.struct.deleteElement'),
          message: this.$t('assetEditor.struct.deleteElementConfirm'),
          danger: true,
        });
      if (!confirm) return;

      this.assetChanger.deleteBlockPropKey(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        `fields\\${item.index}`,
      );
    },
    addElement() {
      const max_index = this.structureItems.reduce(
        (acc, val) => Math.max(acc, val.index),
        -1,
      );
      const op_id = this.assetChanger.makeOpId();
      this.assetChanger.setBlockPropKey(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        'fields',
        [],
        op_id,
      );
      const unique_name = generateNextUniqueNameNumber(
        'untitled',
        (str) => !this.structureItems.some((val) => val.propKey === str),
        '_',
      );
      this.assetChanger.setBlockPropKeys(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        {
          [`fields\\${max_index + 1}\\name`]: unique_name,
          [`fields\\${max_index + 1}\\title`]: unique_name,
          [`fields\\${max_index + 1}\\type`]: null,
          [`fields\\${max_index + 1}\\multiple`]: false,
          [`fields\\${max_index + 1}\\hint`]: null,
          [`fields\\${max_index + 1}\\params`]: null,
        },
        op_id,
      );
    },
  },
});
</script>
<style lang="scss" scoped>
.StructEditor-item {
  margin-bottom: 2px;
}
.StructEditor-items {
  margin-bottom: 10px;
}
</style>
