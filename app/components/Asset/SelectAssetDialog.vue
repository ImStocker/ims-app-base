<template>
  <dialog-content class="SelectAssetDialog" @escape-press="choose(null)">
    <div v-if="dialogHeader" class="Dialog-header">
      {{ dialogHeader }}
    </div>
    <div class="Dialog-content">
      <select-asset-list-box
        v-model:search-value="searchValue"
        class="SelectAssetDialog-list"
        :where="dialog.state.where ?? null"
        :additional-options="dialog.state.additionalOptions ?? []"
        @update:model-value="choose($event)"
      ></select-asset-list-box>
    </div>
    <div class="Dialog-controls Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button class="is-button" @click="choose(null)">
          {{ $t('common.dialogs.cancelCaption') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import SelectAssetListBox from './SelectAssetListBox.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import type { AssetPropWhere } from '../../logic/types/PropsWhere';
import type { AssetPropValueSelection } from '../../logic/types/Props';

type DialogProps = {
  dialogHeader?: string;
  where?: AssetPropWhere | null;
  searchValue?: AssetPropValueSelection | null;
  additionalOptions?: AssetForSelection[];
};

type DialogResult = AssetForSelection;

export default defineComponent({
  name: 'SelectAssetDialog',
  components: {
    DialogContent,
    SelectAssetListBox,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      searchValue: this.dialog.state.searchValue ?? null,
    };
  },
  computed: {
    dialogHeader() {
      return this.dialog.state.dialogHeader;
    },
  },
  methods: {
    choose(val: AssetForSelection | null) {
      this.dialog.close(val ?? undefined);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';

.SelectAssetDialog {
  color: var(--local-text-color);
  font-size: var(--local-font-size);
  padding: 20px;
  width: 460px;
}

.SelectAssetDialog-list {
  --SelectAssetListBox-itemsHeight: 200px;
}
</style>
