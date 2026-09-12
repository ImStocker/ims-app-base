<template>
  <dialog-content class="SelectAssetIconDialog" @escape-press="choose()">
    <div class="Dialog-header">{{ $t('assetEditor.changeIcon') }}</div>
    <select-asset-icon-dropdown-content
      class="SelectAssetIconDialog-content"
      :value="dialog.state.value ?? undefined"
      @input="choose($event)"
    ></select-asset-icon-dropdown-content>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import SelectAssetIconDropdownContent from './SelectAssetIconDropdownContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {
  assetId?: string;
  value: string | null;
};

type DialogResult = string | null | void;

export default defineComponent({
  name: 'SelectAssetIconDialog',
  components: {
    DialogContent,
    SelectAssetIconDropdownContent,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  methods: {
    choose(value?: string | null) {
      this.dialog.close(value);
    },
  },
});
</script>

<style lang="scss" scoped>
.SelectAssetIconDialog {
  padding: 20px;
  width: 580px;
  max-width: calc(100% - 20px);

  .Dialog-header {
    margin-bottom: 10px;
  }
}
</style>
