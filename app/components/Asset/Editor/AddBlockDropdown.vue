<template>
  <menu-button v-model:shown="shown" class="AddBlockDropdown">
    <template #button="{ toggle }">
      <div @click="toggle">
        <slot></slot>
      </div>
    </template>
    <add-block-menu-body
      @select="createBlock($event)"
      @paste-blocks="$emit('paste-blocks')"
      @cancel="shown = false"
    ></add-block-menu-body>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../../Common/MenuButton.vue';
import AddBlockMenuBody from './AddBlockMenuBody.vue';

export default defineComponent({
  name: 'AddBlockDropdown',
  components: {
    MenuButton,
    AddBlockMenuBody,
  },
  props: {
    unelevated: {
      type: Boolean,
      default: false,
    },
    noShadow: {
      type: Boolean,
      default: false,
    },
    transitionDuration: {
      type: Number,
      default: 0,
    },
  },
  emits: ['click', 'paste-blocks'],
  data() {
    return {
      shown: false,
    };
  },
  methods: {
    createBlock(blockName: string) {
      this.shown = false;
      this.$emit('click', blockName);
    },
  },
});
</script>
<style lang="scss" scoped></style>
