<template>
  <dialog-content
    class="AssetHistoryDialog"
    :loading="
      !dialog.state.assetHistory.loadDone &&
      !dialog.state.assetHistory.loadError
    "
    @escape-press="dialog.close()"
  >
    <template #header>
      {{ $t('gddPage.versionsHistory') }}
    </template>
    <asset-history
      :asset-history="dialog.state.assetHistory"
      :show-header="false"
      @close="dialog.close()"
    ></asset-history>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../../logic/managers/DialogManager';
import AssetHistory from './AssetHistory.vue';
import type { AssetHistoryVM } from '#logic/vm/AssetHistoryVM';

type DialogProps = {
  assetHistory: AssetHistoryVM;
};

type DialogResult = null;

export default defineComponent({
  name: 'AssetHistoryDialog',
  components: {
    DialogContent,
    AssetHistory,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.AssetHistoryDialog {
  @include devices-mixins.device-type(pc) {
    width: 800px;
  }
}
</style>
