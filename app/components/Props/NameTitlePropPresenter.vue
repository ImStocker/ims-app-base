<template>
  <div class="NameTitlePropPresenter">
    <template v-if="titleValue">
      <caption-string :value="titleValue ?? ''"></caption-string> ({{
        nameValue
      }})
    </template>
    <template v-else>
      {{ nameValue }}
    </template>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import CaptionString from '../Common/CaptionString.vue';

export default defineComponent({
  name: 'NameTitlePropPresenter',
  components: {
    CaptionString,
  },
  props: {
    type: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    editMode: { type: Boolean, default: false },
  },
  computed: {
    nameValue() {
      return this.formState.combined[this.field.propKey];
    },
    titleValue() {
      return castAssetPropValueToString(this.formState.combined[this.titleKey]);
    },
    titleKey() {
      const key = `${this.field.propKey}`;
      const split = key.split('\\');
      split.pop();
      return split.join('\\') + '\\title';
    },
  },
  watch: {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.NameTitlePropPresenter {
  padding: 5px;
}
</style>
