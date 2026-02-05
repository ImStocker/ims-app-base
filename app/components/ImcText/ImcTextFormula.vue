<template>
  <span class="ImcTextFormula"
@dblclick="edit"
    ><span v-if="currentValue" ref="formula"></span
    ><span v-else class="ImcTextFormula-empty">{{
      $t('imcEditor.formula.empty')
    }}</span
    ><dropdown-container v-if="editMode">
      <div class="ImcTextFormula-edit">
        <textarea
          ref="edit"
          class="is-input ImcTextFormula-edit-input"
          :value="currentValue"
          @input="setValue($event.target?.value)"
        ></textarea
        ><button
          class="is-button is-button-icon danger"
          @click="destroyFormula"
        >
          <i data-v-c3180e96="" class="ri-delete-bin-fill"></i>
        </button></div></dropdown-container
  ></span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import './quill-init';
import { render as katexRender } from 'katex';
import { IMC_FORMULA_BLOT_CLASS } from './blots/ImcFormulaBlot';
import DropdownContainer from '../Common/DropdownContainer.vue';
import { type SetClickOutsideCancel, setImsClickOutside } from '../utils/ui';

export default defineComponent({
  name: 'ImcTextFormula',
  components: {
    DropdownContainer,
  },
  props: {
    value: {
      type: String,
      default: '',
    },
    isEditor: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'destroy'],
  data() {
    return {
      clickOutside: null as SetClickOutsideCancel | null,
      editMode: false,
      currentValue: this.value,
    };
  },
  watch: {
    currentValue() {
      this.rerender();
    },
  },
  mounted() {
    this.rerender();
  },
  unmounted() {
    this.resetClickOutside(false);
  },
  methods: {
    setValue(val: string) {
      this.currentValue = val;
      const parentElement = this.getHtmlElementParent();
      if (parentElement) {
        parentElement.dataset.value = val;
      }
    },
    destroyFormula() {
      this.$emit('destroy', this.value);
      this.editMode = false;
    },
    rerender() {
      if (!this.$refs['formula']) {
        return;
      }
      if (!this.currentValue) {
        return;
      }
      katexRender(this.currentValue, this.$refs['formula'] as HTMLElement, {
        throwOnError: false,
        errorColor: 'var(--color-main-error)',
        strict: false,
      });
    },
    getHtmlElementParent() {
      return this.$el?.closest(
        `.${IMC_FORMULA_BLOT_CLASS}`,
      ) as HTMLElement | null;
    },
    async edit() {
      if (!this.isEditor) return;
      this.editMode = true;
      this.resetClickOutside(true);
      for (let i = 0; i < 2; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (
          this.$refs['edit'] &&
          window.document.activeElement !== this.$refs['edit']
        ) {
          (this.$refs['edit'] as HTMLTextAreaElement).select();
        }
      }
    },
    resetClickOutside(init = false) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (init) {
        this.clickOutside = setImsClickOutside(this.$el, () => {
          this.editMode = false;
          this.resetClickOutside(false);
        });
      }
    },
  },
});
</script>
<style lang="scss">
@use './Toolbar/ImcEditorToolbar.scss';

.ImcTextFormula-edit {
  @include ImcEditorToolbar.ImcEditorToolbar-toolbar;
  padding: 5px;
  display: flex;
  gap: 5px;
  align-items: flex-start;
}
.ImcTextFormula-edit-input {
  display: block;
  border: none;
  --input-padding: 2px var(--input-padding-horizontal);
  max-width: 80dvw;
  width: 300px;
  height: 100px;
}
.ImcTextFormula-empty {
  font-style: italic;
  color: var(--local-sub-text-color);
}
</style>
