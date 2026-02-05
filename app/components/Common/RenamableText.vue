<template>
  <div v-if="isRenamingMode" class="RenamableText-editor">
    <slot
      name="editor"
      :model-value="renamingValue"
      :update-model-value="(val: string) => (renamingValue = val)"
      :validation-error="validationError"
      :word-wrap="wordWrap"
      :apply-renaming="applyRenaming"
      :cancel-renaming="cancelRenaming"
      ><ims-text-input
        ref="input"
        v-model="renamingValue"
        :title="title"
        :validation-error="validationError ?? ''"
        :word-wrap="wordWrap"
        @blur="applyRenaming"
        @enter="applyRenaming"
        @escape="cancelRenaming"
      >
      </ims-text-input>
    </slot>
  </div>
  <div
    v-else
    class="RenamableText-static"
    :title="title"
    @dblclick="startRenaming"
  >
    <slot>
      <div class="RenamableText-static-value">{{ value ? value : ' ' }}</div>
    </slot>
  </div>
</template>

<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';
import ImsTextInput from './ImsTextInput.vue';
import {
  setImsClickOutside,
  type SetClickOutsideCancel,
} from '../utils/ui';

export default defineComponent({
  name: 'RenamableText',
  components: {
    ImsTextInput,
  },
  props: {
    value: {
      type: String,
      default: () => '',
    },
    title: {
      type: String,
      default: () => '',
    },
    getDefaultRenamingRange: { type: Function, default: null },
    getRenamingValue: { type: Function, default: null },
    validateValue: {
      type: [Function, null] as PropType<
        ((value: string) => string | null) | null
      >,
      default: null,
    },
    isRenamingModeState: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    wordWrap: {
      type: Boolean,
      default: () => false,
    },
  },
  emits: ['change', 'update:isRenamingModeState'],
  data() {
    return {
      isRenamingMode: this.isRenamingModeState,
      renamingValue: '',
      clickOutside: null as SetClickOutsideCancel | null,
    };
  },
  computed: {
    validationError() {
      if (!this.isRenamingMode) return null;
      if (!this.validateValue) return null;
      if (this.renamingValue === this.value) return null;
      return this.validateValue(this.renamingValue ?? '');
    },
  },
  watch: {
    isRenamingMode() {
      this.$emit('update:isRenamingModeState', this.isRenamingMode);
    },
    isRenamingModeState() {
      if (this.isRenamingModeState !== this.isRenamingMode) {
        if (this.isRenamingModeState) {
          this.startRenaming();
        } else {
          this.cancelRenaming();
        }
      }
    },
  },
  mounted() {
    if (this.isRenamingMode) {
      this.startRenaming();
    }
  },
  unmounted() {
    this.resetGlobalClickOutside();
  },
  methods: {
    startRenaming() {
      if (this.disabled) return;
      this.renamingValue = this.getRenamingValue
        ? this.getRenamingValue()
        : this.value;
      this.isRenamingMode = true;
      window.setTimeout(() => {
        if (!this.isRenamingMode) {
          return;
        }
        this.resetGlobalClickOutside(true);

        const input = this.$refs['input'] as InstanceType<typeof ImsTextInput>;
        if (!input) return;

        let range = {
          from: 0,
          to: this.renamingValue.length,
        };
        if (this.getDefaultRenamingRange) {
          range = this.getDefaultRenamingRange(this.renamingValue);
        }
        input.selectRange(range.from, range.to);
      }, 1);
    },
    applyRenaming() {
      const original_renaming_value = this.getRenamingValue
        ? this.getRenamingValue()
        : this.value;
      if (this.validationError) return;

      if (this.renamingValue !== original_renaming_value) {
        this.$emit('change', this.renamingValue);
      }
      this.isRenamingMode = false;
      this.resetGlobalClickOutside();
    },
    cancelRenaming() {
      this.isRenamingMode = false;
      this.resetGlobalClickOutside();
    },
    resetGlobalClickOutside(restart = false) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart) {
        this.clickOutside = setImsClickOutside(
          () => this.$el,
          () => {
            this.applyRenaming();
          },
        );
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.RenamableText-static {
  display: flex;
  border-bottom: 1px solid transparent;
}
.RenamableText-static-value {
  white-space: pre;
}
textarea {
  overflow: hidden;
  height: max-content;
}
</style>
