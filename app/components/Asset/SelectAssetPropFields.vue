<template>
  <div class="SelectAssetPropFields is-input" @click="selectFields">
    <div
      class="SelectAssetPropFields-content"
      :class="{
        'has-value': Array.isArray(ownModelValue) && ownModelValue.length,
      }"
    >
      <template v-if="Array.isArray(ownModelValue) && ownModelValue.length">
        <div
          v-for="(field, idx) of ownModelValue"
          :key="field.ref"
          :title="convertTranslatedTitle(field.title, (key) => $t(key))"
        >
          {{ field.name + (idx !== ownModelValue.length - 1 ? ',&nbsp;' : '') }}
        </div>
      </template>
      <template v-else>
        {{ $t('asset.fields.clickToSelectFields') }}
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetPropsPlainObjectValue } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import DialogManager from '../../logic/managers/DialogManager';
import UiManager from '../../logic/managers/UiManager';
import SelectAssetPropFieldsDialog from '../Asset/SelectAssetPropFieldsDialog.vue';
import type { AssetPropField } from './SelectAssetPropFields';

export default defineComponent({
  name: 'SelectAssetPropFields',
  props: {
    modelValue: {
      type: Array as PropType<AssetPropsPlainObjectValue>,
      default: () => [],
    },
    assetId: {
      type: String as PropType<string | null>,
      default: null,
    },
    baseFieldsOnly: {
      type: Boolean,
      default: false,
    },
    showFilter: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue as AssetPropField[];
      },
      set(val: AssetPropsPlainObjectValue) {
        this.$emit('update:model-value', val);
      },
    },
  },
  methods: {
    convertTranslatedTitle,
    async selectFields() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          const res = await this.$getAppManager()
            .get(DialogManager)
            .show(SelectAssetPropFieldsDialog, {
              assetId: this.assetId,
              fields: this.ownModelValue,
              baseFieldsOnly: this.baseFieldsOnly,
              showFilter: this.showFilter,
            });
          if (!res) return;
          this.ownModelValue = res.fields;
        });
    },
  },
});
</script>
<style lang="scss" scoped>
.SelectAssetPropFields {
  display: flex;
  cursor: pointer;
  gap: 10px;

  .SelectAssetPropFields-content {
    display: flex;
    flex-wrap: wrap;
    font-style: italic;
    color: var(--local-sub-text-color);

    &.has-value {
      color: var(--local-text-color);
      font-style: normal;
    }
  }
}
</style>
