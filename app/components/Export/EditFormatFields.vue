<template>
  <div class="EditFormatFields is-input" @click="selectFields">
    <div
      class="EditFormatFields-content"
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
        {{ $t('importExport.formats.settings.clickToSelectFields') }}
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetPropsPlainObjectValue } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import type { ExportFormatField } from '../../logic/managers/ExportFormatManager';
import DialogManager from '../../logic/managers/DialogManager';
import UiManager from '../../logic/managers/UiManager';
import EditFormatFieldsDialog from './EditFormatFieldsDialog.vue';

export default defineComponent({
  name: 'EditFormatFields',
  props: {
    modelValue: {
      type: Array as PropType<AssetPropsPlainObjectValue>,
      default: () => [],
    },
    assetId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue as ExportFormatField[];
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
            .show(EditFormatFieldsDialog, {
              assetId: this.assetId,
              fields: this.ownModelValue,
            });
          if (!res) return;
          this.ownModelValue = res.fields;
        });
    },
  },
});
</script>
<style lang="scss" scoped>
.EditFormatFields {
  display: flex;
  cursor: pointer;
  gap: 10px;

  .EditFormatFields-content {
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
