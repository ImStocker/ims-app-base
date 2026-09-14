<template>
  <div class="StructFieldValueEditor">
    <div v-if="loading" class="StructFieldValueEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="StructFieldValueEditor-loadingError">
      {{ loadingError }}
    </div>
    <div
      v-else-if="recursionDetected"
      class="StructFieldValueEditor-loadingError"
    >
      Recursion detected
    </div>
    <div
      v-else-if="loadedType && subFields.length > 0"
      class="StructFieldValueEditor-fields"
    >
      <div
        v-for="subField of subFields"
        :key="subField.propKey"
        class="StructFieldValueEditor-row"
      >
        <div class="StructFieldValueEditor-row-title">
          <span
            class="StructFieldValueEditor-row-title-dot field-type-dot"
            :class="getFieldTypeDotClass(subField.type)"
          ></span>
          <caption-string :value="getSubFieldTitle(subField)" />
        </div>
        <div class="StructFieldValueEditor-row-value">
          <prop-field-value-stack
            :form-state="formState"
            :edit-mode="editMode"
            :field="subField"
            :display-mode="displayMode"
            @change-props="$emit('changeProps', $event)"
            @enter="$emit('enter')"
          ></prop-field-value-stack>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import type {
  AssetPropValue,
  AssetPropValueAsset,
} from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import { assert } from '../../logic/utils/typeUtils';
import { convertTranslatedTitle } from '../../logic/utils/assets';
import type { AssetDisplayMode } from '../../logic/utils/assets';
import { extractStructFormFields } from '../Asset/SpecialTypes/StructEditor';
import { getFieldTypeDotClass as fieldTypeDotCls } from './fieldTypeDot';
import PropFieldValueStack from './PropFieldValueStack.vue';
import CaptionString from '../Common/CaptionString.vue';

export default defineComponent({
  name: 'StructFieldValueEditor',
  components: {
    PropFieldValueStack,
    CaptionString,
  },
  inject: ['structPropEditorStructIds', 'projectContext'],
  provide() {
    const current = [...((this.structPropEditorStructIds as string[]) ?? [])];
    if (this.typeId) {
      current.push(this.typeId);
    }
    return {
      structPropEditorStructIds: current,
    };
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
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'changeProps'],
  data() {
    return {
      loading: true,
      loadingError: null as string | null,
      loadedType: null as AssetFullInstanceR | null,
    };
  },
  computed: {
    projectContextComp() {
      assert(this.projectContext, 'projectContext is not provided');
      return this.projectContext as IProjectContext;
    },
    recursionDetected() {
      if (!this.typeId) return false;
      return ((this.structPropEditorStructIds as string[]) ?? []).includes(
        this.typeId,
      );
    },
    typeId() {
      const type_value = this.type
        ? this.type
        : this.field.params
          ? (this.field.params as any)['type']
          : null;
      if (type_value && (type_value as AssetPropValueAsset).AssetId) {
        return (type_value as AssetPropValueAsset).AssetId;
      } else return null;
    },
    subFields(): PropsFormFieldDef[] {
      if (!this.loadedType) return [];
      const info_block = this.loadedType.resolvedBlocks.mapNames['info'];
      if (!info_block) return [];
      return extractStructFormFields(info_block, this.field.propKey);
    },
  },
  watch: {
    typeId() {
      this.loadType();
    },
  },
  mounted() {
    this.loadType();
  },
  methods: {
    getFieldTypeDotClass(typeValue: string): string {
      return fieldTypeDotCls(typeValue);
    },
    getSubFieldTitle(subField: PropsFormFieldDef): string {
      const title =
        subField.propTitle ||
        (subField.propName ? subField.propName : '') ||
        '';
      return convertTranslatedTitle(title, (...args) => this.$t(...args));
    },
    async loadType() {
      const type_id = this.typeId;
      this.loadedType = null;
      this.loading = false;
      this.loadingError = null;
      if (!type_id) return;

      try {
        this.loading = true;
        const type = await this.projectContextComp.getAssetInstance(type_id);
        if (type) await type.resolveBlocks();
        if (this.typeId === type_id) {
          this.loadedType = type;
          this.loading = false;
        }
      } catch (err: any) {
        if (this.typeId === type_id) {
          this.loadingError = err.message;
          this.loading = false;
        }
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/field-type-dot' as *;

.StructFieldValueEditor-loading {
  display: flex;
  align-items: center;

  .loaderSpinner {
    margin: 5px;
    font-size: 14px;
  }
}

.StructFieldValueEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}

.StructFieldValueEditor-fields {
  display: flex;
  flex-direction: column;
}

.StructFieldValueEditor-row {
  display: flex;
  align-items: center;
  padding: 2px 0;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
}

.StructFieldValueEditor-row-title {
  flex: 0 1 35%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--local-sub-text-color);
  font-weight: 500;
}

.StructFieldValueEditor-row-title-dot {
  width: 8px;
  height: 8px;
}

.StructFieldValueEditor-row-value {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
