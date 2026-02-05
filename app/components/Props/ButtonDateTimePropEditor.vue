<template>
  <div class="ButtonDateTimePropEditor">
    <button
      v-if="!isFilled"
      class="is-button ButtonDateTimePropEditor-button"
      @click="setValue"
    >
      <caption-string v-if="caption" :value="caption"></caption-string>
      <template v-else>{{ $t('fields.setValue') }}</template>
    </button>
    <template v-else>
      <date-time-prop-presenter
        class="ButtonDateTimePropEditor-val"
        :model-value="modelValue"
      ></date-time-prop-presenter>
      <button
        class="is-button ButtonDateTimePropEditor-button"
        :title="$t('fields.resetValue')"
        @click="resetValue"
      >
        <i class="ri-arrow-go-back-line"></i>
      </button>
    </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import {
  castDateToAssetPropValueTimestamp,
  isFilledAssetPropValue,
} from '../../logic/types/Props';
import DateTimePropPresenter from './DateTimePropPresenter.vue';
import CaptionString from '../Common/CaptionString.vue';
import DialogManager from '../../logic/managers/DialogManager';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  name: 'ButtonDateTimePropEditor',
  components: {
    DateTimePropPresenter,
    CaptionString,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    caption: { type: String, default: '' },
    confirm: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'blur'],
  computed: {
    isFilled() {
      return isFilledAssetPropValue(this.modelValue);
    },
  },
  mounted() {},
  methods: {
    async setValue() {
      if (this.confirm) {
        const action = this.caption
          ? convertTranslatedTitle(this.caption, (...args) => this.$t(...args))
          : this.$t('fields.setValue');
        const confirmed = await this.$getAppManager()
          .get(DialogManager)
          .show(
            ConfirmDialog,
            {
              header: this.$t('common.dialogs.needConfirm'),
              message: this.$t('common.dialogs.confirmationMessage', {
                action,
              }),
            },
            this,
          );
        if (!confirmed) return;
      }
      const now = new Date();
      this.$emit('update:modelValue', castDateToAssetPropValueTimestamp(now));
    },
    async resetValue() {
      if (this.confirm) {
        const action = this.$t('fields.resetValue');
        const confirmed = await this.$getAppManager()
          .get(DialogManager)
          .show(
            ConfirmDialog,
            {
              header: this.$t('common.dialogs.needConfirm'),
              message: this.$t('common.dialogs.confirmationMessage', {
                action,
              }),
            },
            this,
          );
        if (!confirmed) return;
      }
      this.$emit('update:modelValue', null);
    },
  },
});
</script>

<style lang="scss" scoped>
.ButtonDateTimePropEditor {
  padding: 4px 5px;
  display: flex;
  align-items: center;
}
.ButtonDateTimePropEditor-button {
  padding: 0px 12px 1px;
}
.ButtonDateTimePropEditor-val {
  padding: 0;
  margin-right: 10px;
}
</style>
