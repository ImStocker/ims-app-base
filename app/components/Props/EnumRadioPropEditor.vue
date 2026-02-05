<template>
  <div class="EnumRadioPropEditor">
    <div v-if="loading" class="EnumRadioPropEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="EnumRadioPropEditor-loadingError">
      {{ loadingError }}
    </div>
    <div v-else-if="loadedType">
      <label
        v-for="opt of options"
        :key="opt.Name ?? ''"
        class="EnumRadioPropEditor-option"
      >
        <input
          ref="input"
          v-model="selectedValue"
          class="EnumRadioPropEditor-option-radio"
          type="radio"
          :value="opt.Name"
        />
        <caption-string v-if="opt.Title" :value="opt.Title"></caption-string>
        <template v-else>{{ opt.Name }}</template>
      </label>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';
import type {
  AssetPropValue,
  AssetPropValueAsset,
  AssetPropValueEnum,
} from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import CaptionString from '../Common/CaptionString.vue';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import { assert } from '../../logic/utils/typeUtils';

type EnumRadioPropEditorOption = {
  Name: string | null;
  Title: string | null;
};

export default defineComponent({
  name: 'EnumRadioPropEditor',
  components: {
    CaptionString,
  },
  inject: ['projectContext'],
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    type: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    nullable: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter'],
  data() {
    return {
      loading: false,
      loadingError: null as string | null,
      loadedType: null as AssetFullInstanceR | null,
    };
  },
  computed: {
    projectContextComp() {
      assert(this.projectContext, 'projectContext is not provided');
      return this.projectContext as IProjectContext;
    },
    typeId() {
      if (this.type && (this.type as AssetPropValueAsset).AssetId) {
        return (this.type as AssetPropValueAsset).AssetId;
      } else return null;
    },
    selectedValue: {
      get() {
        if (
          this.modelValue &&
          (this.modelValue as AssetPropValueEnum).Enum &&
          (this.modelValue as AssetPropValueEnum).Enum === this.typeId
        ) {
          return (this.modelValue as AssetPropValueEnum).Name;
        } else return null;
      },
      set(val: string | null) {
        const opt = val ? this.options.find((o) => o.Name === val) : undefined;
        this.$emit(
          'update:modelValue',
          opt ? { Enum: this.typeId, Name: opt.Name, Title: opt.Title } : null,
        );
      },
    },
    options(): EnumRadioPropEditorOption[] {
      if (!this.loadedType) return [];

      const options: EnumRadioPropEditorOption[] = [];
      if (this.nullable) {
        options.push({
          Name: null,
          Title: this.$t('fields.noValue'),
        });
      }
      const info_block_key = 'info';
      const struct_fields_indices = this.loadedType.getPropValue(
        info_block_key,
        'items',
      );
      if (Array.isArray(struct_fields_indices.value)) {
        for (const ind of struct_fields_indices.value) {
          const name = this.loadedType.getPropValue(
            info_block_key,
            `items\\${ind}\\name`,
          );
          const title = this.loadedType.getPropValue(
            info_block_key,
            `items\\${ind}\\title`,
          );
          options.push({
            Name: castAssetPropValueToString(name.value),
            Title: title.value ? castAssetPropValueToString(title.value) : null,
          });
        }
      }

      return options;
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
    focus() {
      const input = this.$refs.input as HTMLInputElement[];
      if (!input || !input[0]) return;
      input[0].focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.EnumRadioPropEditor {
  padding-top: 5px;
  padding-left: 5px;
}
.EnumRadioPropEditor-loading {
  display: flex;
  align-items: center;
  .loaderSpinner {
    margin: 5px;
    font-size: 6px;
  }
}

.EnumRadioPropEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}
.EnumRadioPropEditor-select {
  border: none;
  background: none;
  width: 100%;
  display: block;
}

.EnumRadioPropEditor-option {
  margin-right: 10px;
  display: inline-flex;
  align-items: center;
}

.EnumRadioPropEditor-option-radio {
  margin-right: 4px;
}
</style>
