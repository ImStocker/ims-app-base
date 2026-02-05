<template>
  <div class="StringPropEditor">
    <input
      v-if="compMask"
      ref="input"
      v-maska="compMask"
      class="StringPropEditor-input"
      :type="type"
      :placeholder="compPlaceholder"
      :value="valueAsText"
      @keydown="onKeydown($event)"
      @change="emitChange($event)"
      @input="emitInput($event)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <input
      v-else
      ref="input"
      class="StringPropEditor-input"
      :type="type"
      :placeholder="compPlaceholder"
      :value="valueAsText"
      @keydown="onKeydown($event)"
      @change="emitChange($event)"
      @input="emitInput($event)"
      @focus="focused = true"
      @blur="focused = false"
    />
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValue } from '../../logic/types/Props';
import { castAssetPropValueToString } from '../../logic/types/Props';
import { vMaska } from 'maska/vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  name: 'StringPropEditor',
  components: {},
  directives: {
    maska: vMaska,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    placeholder: { type: String, default: '' },
    type: { type: String, default: 'text' },
    mask: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter', 'inputValue'],
  data() {
    return {
      focused: false,
    };
  },
  computed: {
    compMask() {
      if (this.mask) return this.mask;
      if (this.type === 'tel') {
        return '+# ### ###-##-##';
      } else return '';
    },
    compPlaceholder() {
      if (this.placeholder) return this.placeholder;
      if (this.type === 'tel') {
        return '+9 999 999-99-99';
      } else return '';
    },
    valueAsText() {
      const str = castAssetPropValueToString(this.modelValue);
      if (this.focused) return str;
      return convertTranslatedTitle(str, (...p) => this.$t(...p));
    },
  },
  mounted() {},
  methods: {
    emitChange(event: Event) {
      this.$emit(
        'update:modelValue',
        (event?.target as HTMLInputElement)?.value,
      );
    },
    emitInput(event: Event) {
      this.$emit('inputValue', (event?.target as HTMLInputElement)?.value);
    },
    focus() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
    },
    selectAll() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
      input.select();
    },
    focusEnd() {
      const input = this.$refs.input as HTMLInputElement;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    },
    onKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        this.$emit('preEnter');
        this.emitChange(e);
        this.$emit('enter');
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.StringPropEditor-input {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  padding: var(--input-padding);
  background: transparent;
  border: none;
  display: block;
  width: 100%;
}
</style>
