<template>
  <string-prop-presenter
    class="DatePropPresenter"
    :model-value="displayingValue"
  ></string-prop-presenter>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, inject } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { formatDate } from '../../logic/utils/format';
import StringPropPresenter from './StringPropPresenter.vue';
import UiManager from '../../logic/managers/UiManager';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'DatePropPresenter',
  components: {
    StringPropPresenter,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: [],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    displayingValue() {
      const str = castAssetPropValueToString(this.modelValue);
      if (/^\d\d\d\d-\d\d-\d\d/.test(str)) {
        return formatDate(
          str,
          this.projectContext.appManager.get(UiManager).getLanguage(),
        );
      }
      return str;
    },
  },
});
</script>

<style lang="scss" scoped>
.DatePropPresenter {
  padding: 5px;
}
</style>
