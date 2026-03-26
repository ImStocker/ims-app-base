<template>
  <ims-select
    ref="input"
    v-model="selectedValue"
    class="AttributeTypePropEditor"
    :options="options"
    :clearable="true"
    :get-option-key="(o: AttributeTypeOption) => o.value"
    :get-option-label="(o: AttributeTypeOption) => o.title"
    :reduce="(o: AttributeTypeOption) => o.value"
    :placeholder="$t('assetEditor.typeNotSet')"
  >
    <template #no-options>
      {{ $t('common.controls.noMatchingOptions') }}
    </template>
  </ims-select>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, inject } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import ImsSelect from '../Common/ImsSelect.vue';
import type { FieldTypeController } from '../../logic/types/FieldTypeController';
import EditorSubContext from '#logic/project-sub-contexts/EditorSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';
import { assert } from '#logic/utils/typeUtils';

type AttributeTypeOption = { title: string; value: string | null };

export default defineComponent({
  name: 'AttributeTypePropEditor',
  components: {
    ImsSelect,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    nullable: { type: Boolean, default: true },
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
    fieldTypes() {
      return this.projectContext.get(EditorSubContext).getFieldTypesList();
    },
    isDesktop() {
      return this.projectContext.appManager.$appConfiguration.isDesktop;
    },
    displayingFieldTypes() {
      if (this.$appConfiguration.name !== 'creators') {
        if (this.isDesktop) {
          return this.fieldTypes.filter((field) => {
            return ![
              'attributeType',
              'buttonDateTime',
              'projectUser',
              'taskColumn',
              'assetSelector',
              'fieldParams',
              'textAttachment',
              'nameTitle',
              'catalogProject',
              'email',
              'phone',
              'textCut',
              'collectionAssetTitle',
              'localeBlockKey',
              'localeBlockStatus',
            ].includes(field.name);
          });
        }
        return this.fieldTypes;
      } else {
        return [
          'text',
          'string',
          'integer',
          'number',
          'checkbox',
          'gddElementSelector',
          'enum',
          'enumRadio',
          'struct',
          'file',
          'attachment',
          'date',
          'dateTime',
          'buttonDateTime',
          'email',
          'phone',
          'projectUser',
        ]
          .map((type_name) => {
            return this.fieldTypes.find((dt) => dt.name === type_name);
          })
          .filter((dt) => dt) as FieldTypeController[];
      }
    },
    options(): AttributeTypeOption[] {
      const options: AttributeTypeOption[] = [];
      for (const ft of this.displayingFieldTypes) {
        options.push({
          title: convertTranslatedTitle(ft.title, (key) => this.$t(key)),
          value: ft.name,
        });
      }
      if (
        this.selectedValue &&
        !this.projectContext
          .get(EditorSubContext)
          .getFieldTypesMap()
          .hasOwnProperty(this.selectedValue)
      ) {
        options.push({
          title: `${this.selectedValue} (?)`,
          value: this.selectedValue,
        });
      }
      return options;
    },
    selectedValue: {
      get() {
        const str = castAssetPropValueToString(this.modelValue);
        return str ? str : null;
      },
      set(val: string | null) {
        this.$emit('update:modelValue', val);
      },
    },
  },
  mounted() {},
  methods: {
    focus() {
      const input = this.$refs['input'] as InstanceType<typeof ImsSelect>;
      if (!input) return;
      input.focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.AttributeTypePropEditor {
  display: block;
  width: 100%;
}
</style>
