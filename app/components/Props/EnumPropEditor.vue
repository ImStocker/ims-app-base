<template>
  <div class="EnumPropEditor">
    <div v-if="loading" class="EnumPropEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="EnumPropEditor-loadingError">
      {{ loadingError }}
    </div>
    <div v-else-if="loadedType">
      <ims-select
        ref="input"
        v-model="selectedValue"
        class="EnumPropEditor-select"
        :options="options"
        :clearable="nullable"
        :get-option-label="getOptionLabel"
        :get-option-key="(o: EnumPropEditorOption) => o.Name"
      >
        <template #selected-option="{ option }">
          <div
            class="EnumPropEditor-select-value"
            :class="{ 'state-error': !option.Enum }"
          >
            {{ getOptionLabel(option) }}
          </div>
        </template>
        <template #no-options>
          {{ $t('common.controls.noMatchingOptions') }}
        </template>
      </ims-select>
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
import { convertTranslatedTitle } from '../../logic/utils/assets';
import type { IProjectContext } from '../../logic/types/IProjectContext';
import ImsSelect from '../Common/ImsSelect.vue';
import { assert } from '../../logic/utils/typeUtils';

type EnumPropEditorOption = {
  Enum: string | null;
  Name: string;
  Title: string | null;
};

export default defineComponent({
  name: 'EnumPropEditor',
  components: {
    ImsSelect,
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
      get(): EnumPropEditorOption | null {
        if (
          this.modelValue === null ||
          this.modelValue === undefined ||
          this.modelValue === ''
        ) {
          return null;
        } else if (
          this.modelValue &&
          (this.modelValue as AssetPropValueEnum).Enum &&
          (this.modelValue as AssetPropValueEnum).Enum === this.typeId
        ) {
          return this.modelValue as AssetPropValueEnum;
        } else
          return {
            Enum: null,
            Title: castAssetPropValueToString(this.modelValue),
            Name: castAssetPropValueToString(this.modelValue),
          };
      },
      set(val: EnumPropEditorOption | null) {
        if (!val) {
          this.$emit('update:modelValue', null);
        } else if (val.Enum) {
          this.$emit('update:modelValue', val);
        } else {
          // Not enum value
          this.$emit('update:modelValue', val.Name);
        }
      },
    },
    options(): EnumPropEditorOption[] {
      if (!this.loadedType) return [];

      const options: EnumPropEditorOption[] = [];
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
            Enum: this.typeId,
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
    getOptionLabel(opt: any) {
      return convertTranslatedTitle(opt.Title ? opt.Title : opt.Name, (...x) =>
        this.$t(...x),
      );
    },
    openDropDown() {
      if (
        this.$refs.input &&
        (this.$refs.input as InstanceType<typeof ImsSelect>).openDropdown
      ) {
        (this.$refs.input as InstanceType<typeof ImsSelect>).openDropdown();
      }
    },
    activate() {
      this.openDropDown();
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
      const input = this.$refs.input as InstanceType<typeof ImsSelect>;
      if (!input) return;
      input.focus();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins';
.EnumPropEditor-loading {
  display: flex;
  align-items: center;
  padding-top: 5px;
  .loaderSpinner {
    font-size: 14px;
    margin: 5px;
  }
}

.EnumPropEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}
.EnumPropEditor-select {
  width: 100%;
  display: block;
  --vs-search-input-color: var(--text-intense);
  --vs-selected-color: var(--text-intense);
}
.EnumPropEditor-select-value {
  &.state-error {
    color: var(--color-main-error);
  }
}
</style>
