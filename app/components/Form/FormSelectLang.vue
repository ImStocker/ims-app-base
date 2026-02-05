<template>
  <ims-select
    class="FormSelectLang"
    :model-value="value"
    :reduce="(lang: LangObj) => lang.name"
    :options="options"
    :disabled="disabled"
    :clearable="clearable"
    :get-option-label="(lang: LangObj) => `${lang.title} - ${lang.enTitle}`"
    @update:model-value="emitValue($event)"
  ></ims-select>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';
import { Lang } from '../../logic/types/ProjectTypes';
import ImsSelect from '../Common/ImsSelect.vue';

type LangObj = {
  name: string;
  title: string;
  enTitle: string;
};

export default defineComponent({
  title: 'FormSelectLang',
  components: {
    ImsSelect,
  },
  props: {
    value: {
      type: String,
      default: () => 'en',
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['input'],
  computed: {
    options(): LangObj[] {
      return [
        {
          name: Lang.EN,
          title: 'English',
          enTitle: 'English',
        },
        {
          name: Lang.RU,
          title: 'Русский',
          enTitle: 'Russian',
        },
      ];
    },
  },
  methods: {
    emitValue(val: string) {
      this.$emit('input', val);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormSelectLang {
  width: 200px;
}
</style>
