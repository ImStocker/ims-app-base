<template>
  <div class="EnumEditor">
    <sortable-list
      class="EnumEditor-items"
      handle-selector=".SomeEditorListItem-drag"
      id-key="name"
      :list="enumItems"
      :disabled="readonly"
      @update:list="reorder($event)"
    >
      <template #default="{ item }">
        <enum-editor-item
          class="EnumEditor-item"
          :item="item"
          :block="block"
          :asset-changer="assetChanger"
          :enum-items="enumItems"
          :readonly="readonly"
          @delete="deleteElement(item)"
        ></enum-editor-item>
      </template>
    </sortable-list>
    <button
      v-if="!readonly"
      class="is-button is-button-action"
      @click="addElement"
    >
      {{ $t('assetEditor.enum.addElement') }}
    </button>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import type { AssetChanger } from '../../../logic/types/AssetChanger';
import {
  castAssetPropValueToString,
  makeBlockRef,
} from '../../../logic/types/Props';
import type { EnumItem } from './EnumEditor';
import EnumEditorItem from './EnumEditorItem.vue';
import SortableList from '../../Common/SortableList.vue';
import { generateNextUniqueNameNumber } from '../../../logic/utils/stringUtils';
import DialogManager from '../../../logic/managers/DialogManager';
import ConfirmDialog from '../../Common/ConfirmDialog.vue';

export default defineComponent({
  name: 'EnumEditor',
  components: {
    SortableList,
    EnumEditorItem,
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
    enumItems(): EnumItem[] {
      const res: EnumItem[] = [];
      if (Array.isArray(this.block.computed.items)) {
        const item_inds: number[] = this.block.computed.items as number[];
        for (const item_ind of item_inds) {
          const name = castAssetPropValueToString(
            this.block.computed[`items\\${item_ind}\\name`],
          );
          const title = this.block.computed[`items\\${item_ind}\\title`]
            ? castAssetPropValueToString(
                this.block.computed[`items\\${item_ind}\\title`],
              )
            : null;
          res.push({
            name,
            title,
            index: item_ind,
          });
        }
      }
      return res;
    },
  },
  methods: {
    reorder(new_list: EnumItem[]) {
      const old_list = [...this.enumItems];
      let diff_start = 0;
      for (; diff_start < new_list.length; diff_start++) {
        if (new_list[diff_start].name !== old_list[diff_start].name) {
          break;
        }
      }
      let diff_end = new_list.length;
      for (; diff_end > 0; diff_end--) {
        if (new_list[diff_end - 1].name !== old_list[diff_end - 1].name) {
          break;
        }
      }

      const op_id = this.assetChanger.makeOpId();
      const cur_props = { ...this.block.computed };
      for (let i = diff_start; i < diff_end; i++) {
        for (const [prop, val] of Object.entries(cur_props)) {
          const prop_prefix = `items\\${new_list[i].index}\\`;
          if (prop.startsWith(prop_prefix)) {
            this.assetChanger.setBlockPropKey(
              this.block.assetId,
              makeBlockRef(this.block),
              null,
              `items\\${old_list[i].index}\\` +
                prop.substring(prop_prefix.length),
              val,
              op_id,
            );
          }
        }
      }
    },
    async deleteElement(item: EnumItem) {
      const confirm = await this.$getAppManager()
        .get(DialogManager)
        .show(ConfirmDialog, {
          header: this.$t('assetEditor.enum.deleteElement'),
          message: this.$t('assetEditor.enum.deleteElementConfirm'),
          danger: true,
        });
      if (!confirm) return;

      this.assetChanger.deleteBlockPropKey(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        `items\\${item.index}`,
      );
    },
    addElement() {
      const max_index = this.enumItems.reduce(
        (acc, val) => Math.max(acc, val.index),
        -1,
      );
      const op_id = this.assetChanger.makeOpId();
      this.assetChanger.setBlockPropKey(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        'items',
        [],
        op_id,
      );
      this.assetChanger.setBlockPropKeys(
        this.block.assetId,
        makeBlockRef(this.block),
        null,
        {
          [`items\\${max_index + 1}\\name`]: generateNextUniqueNameNumber(
            'untitled',
            (str) => !this.enumItems.some((val) => val.name === str),
            '_',
          ),
          [`items\\${max_index + 1}\\title`]: null,
        },
        op_id,
      );
    },
  },
});
</script>
<style lang="scss" scoped>
.EnumEditor-item {
  margin-bottom: 2px;
}
.EnumEditor-items {
  margin-bottom: 10px;
}
</style>
