<template>
  <div class="FieldParamsEditor">
    <textarea
      :value="jsonValue"
      @change="emitValueFromEvent($event)"
    ></textarea>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import UiManager from '../../logic/managers/UiManager';
import { extractAssetPropsSubObject } from '../../logic/types/Props';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import { makeDeletePropKey } from '../../logic/types/makePropsChange';

export default defineComponent({
  name: 'FieldParamsEditor',
  components: {},
  props: {
    formState: {
      type: Object as PropType<PropsFormState>,
      required: true,
    },
    field: {
      type: Object as PropType<PropsFormFieldDef>,
      required: true,
    },
  },
  emits: ['changeProps'],
  data() {
    return {};
  },
  computed: {
    jsonValue() {
      const key = `${this.field.propKey}`;
      const obj = extractAssetPropsSubObject(this.formState.combined, key);
      return JSON.stringify(obj, null, 2);
    },
  },
  mounted() {},
  methods: {
    emitValueFromEvent(event: Event) {
      const val = (event?.target as HTMLTextAreaElement)?.value;
      let parsed: any;
      try {
        parsed = JSON.parse(val);
      } catch (err: any) {
        this.$getAppManager().get(UiManager).showError(err);
        return;
      }
      const key = `${this.field.propKey}`;
      this.$emit('changeProps', [
        makeDeletePropKey(key),
        Object.fromEntries(
          [...Object.entries(parsed)].map(([prop, val]) => {
            return [`${key}\\${prop}`, val];
          }),
        ),
      ]);
    },
  },
});
</script>

<style lang="scss" scoped></style>
