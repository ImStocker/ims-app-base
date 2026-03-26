<template>
  <div class="AttributeTypePropPresenter">
    {{ displayingValue }}
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, inject } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

export default defineComponent({
  name: 'AttributeTypePropPresenter',
  components: {},
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
  },
  emits: ['update:modelValue', 'blur'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    fieldTypesMap() {
      return this.projectContext.get(EditorSubContext).getFieldTypesMap();
    },
    displayingValue() {
      const type = castAssetPropValueToString(this.modelValue);
      if (!type) {
        return this.$t('assetEditor.typeNotSet');
      }
      if (!this.fieldTypesMap.hasOwnProperty(type)) {
        return type;
      } else
        return convertTranslatedTitle(this.fieldTypesMap[type].title, (key) =>
          this.$t(key),
        );
    },
  },
  mounted() {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.AttributeTypePropPresenter {
  padding: 5px;
}
</style>
