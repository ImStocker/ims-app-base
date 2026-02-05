<template>
  <div class="NameTitlePropEditor">
    <input
      type="text"
      class="NameTitlePropEditor-name is-input"
      :placeholder="$t('fields.serviceName')"
      :value="nameValue"
      @change="emitValueFromEvent(field.propKey, $event)"
    />
    <input
      type="text"
      class="NameTitlePropEditor-title is-input"
      :placeholder="$t('fields.displayTitle')"
      :value="titleValue"
      @change="emitValueFromEvent(titleKey, $event)"
    />
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';

export default defineComponent({
  name: 'NameTitlePropEditor',
  components: {},
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
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'changeProps'],
  computed: {
    nameValue() {
      return this.formState.combined[this.field.propKey];
    },
    titleValue() {
      return this.formState.combined[this.titleKey];
    },
    titleKey() {
      const key = `${this.field.propKey}`;
      const split = key.split('\\');
      split.pop();
      return split.join('\\') + '\\title';
    },
  },
  watch: {},
  methods: {
    emitValueFromEvent(field: string, event: Event) {
      this.$emit('changeProps', [
        {
          [field]: (event?.target as HTMLInputElement)?.value,
        },
      ]);
    },
  },
});
</script>

<style lang="scss" scoped>
.NameTitlePropEditor {
  display: flex;
  flex-wrap: wrap;
}

.NameTitlePropEditor-name,
.NameTitlePropEditor-title {
  flex: 1;
  min-width: 50px;
}
</style>
