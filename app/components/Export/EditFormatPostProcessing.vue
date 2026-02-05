<template>
  <div class="EditFormatPostProcessing">
    <div class="EditFormatPostProcessing-caption">
      {{ caption }}
    </div>
    <div class="EditFormatPostProcessing-control">
      <i v-if="modelValue" class="ri-checkbox-line"></i>
      <button
        class="is-button is-button-action accent"
        :disabled="isLoading"
        :class="{ loading: isLoading }"
        @click="openPostProcessing"
      >
        {{ $t('common.dialogs.' + (modelValue ? 'edit' : 'add')) }}
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetPropsPlainObject } from '../../logic/types/Props';
import UiManager from '../../logic/managers/UiManager';
import DialogManager from '../../logic/managers/DialogManager';

export default defineComponent({
  name: 'EditFormatPostProcessing',
  meta: {
    containsCaption: true,
  },
  props: {
    modelValue: {
      type: String as PropType<string | null>,
      default: null,
    },
    caption: {
      type: String,
      default: null,
    },
    getSampleAsset: {
      type: Function as PropType<() => Promise<AssetPropsPlainObject>>,
      default: null,
    },
  },
  emits: ['update:model-value'],
  data() {
    return {
      isLoading: false,
    };
  },
  methods: {
    async openPostProcessing() {
      this.isLoading = true;

      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const EditFormatPostProcessingDialog = await import(
            './EditFormatPostProcessingDialog.vue'
          );

          const sample_asset = this.getSampleAsset
            ? await this.getSampleAsset()
            : null;

          const res = await this.$getAppManager()
            .get(DialogManager)
            .show(EditFormatPostProcessingDialog.default, {
              jscode: this.modelValue ?? '',
              sampleAsset: sample_asset,
            });

          if (res) {
            this.$emit('update:model-value', res.jscode);
          }
        });

      this.isLoading = false;
    },
  },
});
</script>
<style lang="scss" scoped>
.EditFormatPostProcessing {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .EditFormatPostProcessing-control {
    display: flex;
    gap: 5px;
    align-items: center;

    i {
      font-size: 24px;
      line-height: 24px;

      &.ri-checkbox-line {
        color: var(--color-main-yellow);
      }
      &.ri-checkbox-blank-line {
        color: #ccc;
      }
    }
  }
}
</style>
