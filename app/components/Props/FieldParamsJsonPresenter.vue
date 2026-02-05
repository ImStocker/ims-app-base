<template>
  <div class="FieldParamsPresenter">
    {{ jsonValue }}
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { extractAssetPropsSubObject } from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';

export default defineComponent({
  name: 'FieldParamsPresenter',
  components: {},
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
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter'],
  data() {
    return {};
  },
  computed: {
    jsonValue() {
      const key = `${this.field.propKey}`;
      const obj = extractAssetPropsSubObject(this.formState.combined, key);
      const res = JSON.stringify(obj, null, 2);
      if (res === '{}') return '';
      return res;
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped></style>
