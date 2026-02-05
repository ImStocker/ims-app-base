<template>
  <div class="AssetEditorPropsBlockValueStack">
    <template v-if="!field.multiple">
      <div class="AssetEditorPropsBlockValueStack-item">
        <props-block-value
          ref="first"
          class="AssetEditorPropsBlockValueStack-item-value"
          :edit-mode="editMode"
          :model-value="
            formState.values[field.propKey]
              ? editMode
                ? formState.values[field.propKey].value
                : formState.values[field.propKey].computedValue
              : null
          "
          :same-value="
            formState.values[field.propKey]
              ? editMode
                ? formState.values[field.propKey].same
                : formState.values[field.propKey].computedSame
              : true
          "
          :computed-state="
            editMode
              ? true
              : formState.values[field.propKey]
                ? formState.values[field.propKey].computedState
                : true
          "
          :field="field"
          :class="{
            'state-inherited': formState.values[field.propKey]
              ? formState.values[field.propKey].inherited
              : false,
          }"
          :form-state="formState"
          :display-mode="displayMode"
          @enter="$emit('enter')"
          @update:model-value="changeValue(field, $event)"
          @change-props="$emit('changeProps', $event)"
          v-on="{
            inputProps: onInputProps ? onInputProps : null,
            inputValue: onInputProps
              ? (event: AssetPropValue) => inputValue(field, event)
              : null,
          }"
        ></props-block-value>
      </div>
    </template>
    <template v-else>
      <div
        v-for="ent of entries"
        :key="ent.index"
        class="AssetEditorPropsBlockValueStack-item"
      >
        <props-block-value
          ref="propsBlockValues"
          class="AssetEditorPropsBlockValueStack-item-value"
          :edit-mode="editMode"
          :model-value="
            formState.values[ent.field.propKey]
              ? editMode
                ? formState.values[ent.field.propKey].value
                : formState.values[ent.field.propKey].computedValue
              : null
          "
          :same-value="
            formState.values[ent.field.propKey]
              ? editMode
                ? formState.values[ent.field.propKey].same
                : formState.values[ent.field.propKey].computedSame
              : true
          "
          :computed-state="
            editMode
              ? true
              : formState.values[ent.field.propKey]
                ? formState.values[ent.field.propKey].computedState
                : true
          "
          :field="ent.field"
          :class="{
            'state-inherited': formState.values[ent.field.propKey]
              ? formState.values[ent.field.propKey].inherited
              : false,
          }"
          :form-state="formState"
          :display-mode="displayMode"
          @change-props="$emit('changeProps', $event)"
          @enter="$emit('enter')"
          @update:model-value="changeValue(ent.field, $event)"
          v-on="{
            inputProps: onInputProps ? onInputProps : null,
            inputValue: onInputProps
              ? (event: AssetPropValue) => inputValue(ent.field, event)
              : null,
          }"
        ></props-block-value>
        <button
          v-if="editMode"
          class="is-button is-button-icon AssetEditorPropsBlockValueStack-delete"
          :title="$t('assetEditor.propsBlockDeleteElement')"
          @click="deleteItem(ent)"
        >
          <i class="ri-delete-bin-fill"></i>
        </button>
      </div>
      <div v-if="editMode" class="AssetEditorPropsBlockValueStack-add">
        <button
          class="is-button AssetEditorPropsBlockValueStack-add-button"
          @click="addItem"
        >
          {{ $t('assetEditor.propsBlockAddElement') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import type { AssetProps, AssetPropValue } from '#logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '#logic/types/PropsForm';
import { escapeRegExp } from '#logic/utils/stringUtils';
import PropsBlockValue from './PropsBlockValue.vue';
import type { AssetDisplayMode } from '#logic/utils/assets';
import { makeDeletePropKey } from '#logic/types/makePropsChange';

type PropsBlockValueStackEntry = {
  index: number;
  field: PropsFormFieldDef;
};

export default defineComponent({
  name: 'AssetEditorPropsBlockValueStack',
  components: { PropsBlockValue },
  props: {
    editMode: {
      type: Boolean,
      default: false,
    },
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
    onInputProps: {
      type: Function,
      default: null,
    },
  },
  emits: ['enter', 'changeProps', 'inputProps', 'input'],
  data() {
    return {};
  },
  computed: {
    isSingularValue() {
      if (!this.field.multiple) return true;
      if (!this.formState.values.hasOwnProperty(this.field.propKey))
        return false;
      return (
        this.formState.values[this.field.propKey].computedValue !== null &&
        this.formState.values[this.field.propKey].computedValue !== undefined &&
        !Array.isArray(this.formState.values[this.field.propKey].computedValue)
      );
    },
    entries(): PropsBlockValueStackEntry[] {
      if (!this.field.multiple) return [];
      if (this.isSingularValue) {
        return [
          {
            index: 0,
            field: {
              ...this.field,
              propKey: `${this.field.propKey}`,
              multiple: false,
            },
          },
        ];
      }
      const res: PropsBlockValueStackEntry[] = [];
      const indices_set = new Set<number>();
      const index_regexp = new RegExp(
        '^' + escapeRegExp(this.field.propKey + '\\') + '(-?\\d+(\\.\\d+)?)',
      );
      for (const [prop, _val] of Object.entries(this.formState.combined)) {
        const match = prop.match(index_regexp);
        if (match && (match[0] === prop || prop[match[0].length] === '\\')) {
          const index = parseFloat(match[1]);
          if (!indices_set.has(index)) {
            res.push({
              index,
              field: {
                ...this.field,
                propKey: `${this.field.propKey}\\${match[1]}`,
                multiple: false,
              },
            });
            indices_set.add(index);
          }
        }
      }
      res.sort((a, b) => a.index - b.index);
      return res;
    },
  },
  watch: {},
  methods: {
    _getFirstFieldComponent(): InstanceType<typeof PropsBlockValue> | null {
      if (this.$refs.first) {
        return this.$refs.first as InstanceType<typeof PropsBlockValue>;
      } else if (
        this.$refs.propsBlockValues &&
        (this.$refs.propsBlockValues as InstanceType<typeof PropsBlockValue>[])
          .length > 0
      ) {
        return this.$refs.propsBlockValues[0];
      }
      return null;
    },
    _callComponentCommand(
      method: keyof InstanceType<typeof PropsBlockValue>,
      args: any[] = [],
    ): boolean {
      const first = this._getFirstFieldComponent();
      if (!first) return false;
      if (first[method]) {
        return first[method](...args);
      }
      return false;
    },
    focusEnd() {
      return this._callComponentCommand('focusEnd');
    },
    focus() {
      return this._callComponentCommand('focus');
    },
    onFocusAt(ev: CustomEvent) {
      return this._callComponentCommand('onFocusAt', [ev]);
    },
    selectAll() {
      return this._callComponentCommand('selectAll');
    },
    async awaitFirstComponentReady(): Promise<boolean> {
      const first = this._getFirstFieldComponent();
      if (!first) return false;
      await first.awaitComponentReady();
      return true;
    },
    async addItem() {
      const last_index =
        this.entries.length > 0
          ? this.entries[this.entries.length - 1].index
          : -1;
      let set_singular_value: AssetPropValue | undefined = undefined;
      if (this.isSingularValue) {
        set_singular_value = this.formState.values[this.field.propKey].value;
      }

      const changes: AssetProps[] = [];
      changes.push({
        [`${this.field.propKey}`]: [],
      });
      if (set_singular_value !== undefined) {
        changes.push({
          [`${this.field.propKey}\\0`]: set_singular_value,
        });
      }
      changes.push({
        [`${this.field.propKey}\\${last_index + 1}`]: null,
      });
      this.$emit('changeProps', changes);

      await new Promise((res) => setTimeout(res, 10));
      if (!this.$refs.propsBlockValues) return;
      const propsBlockValues = this.$refs.propsBlockValues as InstanceType<
        typeof PropsBlockValue
      >[];
      if (propsBlockValues.length > 0) {
        propsBlockValues[propsBlockValues.length - 1].activate();
      }
    },
    changeValue(entry: PropsFormFieldDef, val: AssetPropValue) {
      this.$emit('changeProps', [
        {
          [entry.propKey]: val,
        },
      ]);
    },
    inputValue(entry: PropsFormFieldDef, val: AssetPropValue) {
      this.$emit('inputProps', [
        {
          [entry.propKey]: val,
        },
      ]);
    },
    deleteItem(entry: PropsBlockValueStackEntry) {
      if (this.isSingularValue) {
        this.$emit('changeProps', [
          {
            [this.field.propKey]: [],
          },
        ]);
      } else {
        this.$emit('changeProps', [makeDeletePropKey(entry.field.propKey)]);
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorPropsBlockValueStack-item {
  display: flex;
  align-items: flex-start;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
}

.AssetEditorPropsBlockValueStack-item-value {
  flex: 1;

  &.state-inherited {
    color: var(--color-inherited-value);
  }
}

.AssetEditorPropsBlockValueStack-delete {
  margin-top: 2px;
  margin-left: 5px;
}

.AssetEditorPropsBlockValueStack-add {
  padding: 4px 5px;
}

.AssetEditorPropsBlockValueStack-add-button {
  --button-padding: 0.37em 0.33em;
}
</style>
