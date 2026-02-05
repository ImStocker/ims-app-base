<template>
  <dialog-content
    class="AttachPresenterDialog"
    @escape-press="choose()"
    @enter-press="choose()"
  >
    <div v-if="loadingError" class="error-message-block">
      {{ loadingError }}
    </div>
    <template v-else>
      <imc-presenter
        class="AttachPresenterDialog-ImcPresenter"
        :value="dialog.state.result"
      />
      <div class="Form-row-buttons">
        <div class="Form-row-buttons-center">
          <button
            class="is-button accent AttachPresenterDialog-Form-row-button-attach"
            @click="choose()"
          >
            {{ $t('common.dialogs.close') }}
          </button>
        </div>
      </div>
    </template>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import UiManager from '../../logic/managers/UiManager';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../logic/types/Props';
import ImcPresenter from '../ImcText/ImcPresenter.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';

type DialogProps = {
  result: AssetPropValue;
};

type DialogResult = {
  result: AssetPropValue;
};

export default defineComponent({
  name: 'AttachPresenterDialog',
  components: {
    DialogContent,
    ImcPresenter,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      loadingError: null as string | null,
    };
  },
  computed: {
    valueAsText() {
      return castAssetPropValueToString(this.dialog.state.result as any);
    },
  },
  methods: {
    choose() {
      return this.dialog.close();
    },
    showError(error: any) {
      this.$getAppManager().get(UiManager).showError(error);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AttachPresenterDialog {
  width: 625px;
  padding: 20px;
}

.AttachPresenterDialog-ImcPresenter {
  margin-bottom: 20px;
}
</style>
