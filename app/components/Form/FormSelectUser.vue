<template>
  <ims-select
    v-model="editingValue"
    class="FormSelect"
    :options="options"
    :label-prop="'Name'"
    :readonly="disabled"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="$t('boardPage.assignedToNobody')"
  >
  </ims-select>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValueAccount } from '../../logic/types/Props';
import ImsSelect from '../Common/ImsSelect.vue';

export default defineComponent({
  title: 'FormSelectUser',
  components: {
    ImsSelect,
  },
  props: {
    value: {
      type: [Object, null] as PropType<AssetPropValueAccount | null>,
      default: () => null,
    },
    options: {
      type: Array<AssetPropValueAccount>,
      required: true,
    },
    clearable: {
      type: Boolean,
      default: () => false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['input'],
  data() {
    return {
      editingValue: this.value,
    };
  },
  computed: {
    hasOptions() {
      return this.options.length > 0;
    },
  },
  watch: {
    editingValue() {
      this.$emit('input', this.editingValue);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormSelect {
  min-width: 200px;
}
</style>
