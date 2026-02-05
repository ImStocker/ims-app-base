<template>
  <div class="MenuButton">
    <slot
      name="button"
      :tooltip="tooltip"
      :show="show"
      :hide="hide"
      :toggle="toggle"
    >
      <button
        class="is-button is-button-dropdown MenuButton-button ref-button"
        :title="tooltip"
        @click="toggle"
      >
        <slot name="button-icon"><i class="ri-more-2-fill"></i></slot>
      </button>
    </slot>
    <dropdown-element
      v-model:shown="ownShown"
      :attach-position="attachPosition"
    >
      <div class="MenuButton-dropdown" @imc-menu-action-executed="hide">
        <slot></slot>
      </div>
    </dropdown-element>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DropdownElement from './DropdownElement.vue';
import type { DropdownElementPlacement } from '../../logic/types/DropdownElement';

export default defineComponent({
  name: 'MenuButton',
  components: {
    DropdownElement,
  },
  props: {
    tooltip: { type: String, default: '' },
    attachPosition: {
      type: String as PropType<DropdownElementPlacement>,
      default: 'bottom',
    },
    shown: { type: Boolean, default: false },
  },
  emits: ['show', 'hide', 'update:shown'],
  data() {
    return {
      ownShown: this.shown,
    };
  },
  watch: {
    shown() {
      if (this.ownShown !== this.shown) {
        this.ownShown = this.shown;
      }
    },
    ownShown() {
      if (this.ownShown) {
        this.$emit('show');
      } else {
        this.$emit('hide');
      }
      if (this.ownShown !== this.shown) {
        this.$emit('update:shown', this.ownShown);
      }
    },
  },
  methods: {
    show() {
      this.ownShown = true;
    },
    hide() {
      this.ownShown = false;
    },
    toggle() {
      this.ownShown = !this.ownShown;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped></style>
