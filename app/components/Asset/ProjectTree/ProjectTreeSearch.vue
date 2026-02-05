<template>
  <selection-prop-editor
    ref="input"
    v-model="dirtyValue"
    :placeholder="
      placeholder !== null ? placeholder : $t('gddPage.menu.search') + '...'
    "
    class="ProjectTreeSearch"
  >
    <template #append>
      <button
        v-if="dirtyValueTrimmed"
        class="ProjectTreeSearch-button"
        @click="clear()"
      >
        <i class="ri-close-fill ProjectTreeSearch-icon"></i>
      </button>
      <i v-else class="ri-search-line ProjectTreeSearch-icon" />
    </template>
  </selection-prop-editor>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetPropValueSelection } from '../../../logic/types/Props';
import SelectionPropEditor from '../../Props/SelectionProp/SelectionPropEditor.vue';
import { debounceForThis } from '../../utils/ComponentUtils';

export default defineComponent({
  name: 'ProjectTreeSearch',
  components: {
    SelectionPropEditor,
  },
  props: {
    modelValue: {
      type: [Object, null] as PropType<AssetPropValueSelection | null>,
      default: null,
    },
    autofocus: {
      type: Boolean,
      default: () => false,
    },
    placeholder: {
      type: [String, null],
      default: null,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      dirtyValue: this.modelValue,
    };
  },
  computed: {
    dirtyValueTrimmed() {
      if (this.dirtyValue === null) return null;
      const res = {
        ...this.dirtyValue,
        Str: (this.dirtyValue.Str ?? '').trim(),
      };
      if (!res.Str) return null;
      return res;
    },
  },
  watch: {
    dirtyValue() {
      this.emitChangeDelayed();
    },
    modelValue() {
      if (
        JSON.stringify(this.dirtyValueTrimmed) !==
        JSON.stringify(this.modelValue)
      ) {
        this.dirtyValue = this.modelValue;
      }
    },
  },
  async mounted() {
    if (this.autofocus) {
      setTimeout(() => {
        this.focus();
      }, 1);
    }
  },
  methods: {
    emitChangeDelayed: debounceForThis(function (this: any) {
      this.emitChange();
    }, 300),
    emitChange() {
      if (
        JSON.stringify(this.dirtyValueTrimmed) !==
        JSON.stringify(this.modelValue)
      ) {
        this.$emit('update:modelValue', this.dirtyValueTrimmed);
      }
    },
    focus() {
      if (!this.$refs.input) return;
      (this.$refs.input as InstanceType<typeof SelectionPropEditor>).focus();
    },
    clear() {
      this.dirtyValue = null;
      this.emitChange();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ProjectTreeSearch-button {
  padding: 0;
  background: transparent;
  border: none;
}

.ProjectTreeSearch-icon {
  cursor: pointer;
  color: var(--input-placeholder-color);
}
</style>
