<template>
  <div class="StructPropEditor">
    <div v-if="loading" class="StructPropEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="StructPropEditor-loadingError">
      {{ loadingError }}
    </div>
    <div v-else-if="recursionDetected" class="StructPropEditor-loadingError">
      Recursion detected
    </div>
    <div v-else-if="loadedType && structForm">
      <props-block-sheet
        ref="sheet"
        :edit-mode="editMode"
        :form-def="structForm"
        :form-state="formState"
        :display-mode="displayMode"
        @change-props="$emit('changeProps', $event)"
      ></props-block-sheet>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineAsyncComponent, defineComponent } from 'vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import type {
  AssetPropValue,
  AssetPropValueAsset,
} from '../../logic/types/Props';
import type {
  PropsFormDef,
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import { assert } from '../../logic/utils/typeUtils';
import type { AssetDisplayMode } from '../../logic/utils/assets';
import { extractStructFormFields } from '../Asset/SpecialTypes/StructEditor';

export default defineComponent({
  name: 'StructPropEditor',
  components: {
    PropsBlockSheet: defineAsyncComponent(
      () => import('~ims-plugin-base/blocks/PropsBlock/PropsBlockSheet.vue'),
    ),
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
      if (this.type && (this.type as AssetPropValueAsset).AssetId) {
        return (this.type as AssetPropValueAsset).AssetId;
      } else return null;
    },
    structForm(): PropsFormDef | null {
      if (!this.loadedType) return null;
      const info_block = this.loadedType.resolvedBlocks.mapNames['info'];
      if (!info_block) {
        return null;
      }
      const form_fields: PropsFormFieldDef[] = extractStructFormFields(
        info_block,
        this.field.propKey,
      );

      return {
        differentFieldsNum: 0,
        fields: form_fields,
      };
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
.StructPropEditor-loading {
  display: flex;
  align-items: center;
  .loaderSpinner {
    margin: 5px;
    font-size: 14px;
  }
}

.StructPropEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}
</style>
