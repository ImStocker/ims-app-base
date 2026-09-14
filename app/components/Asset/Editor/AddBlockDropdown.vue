<template>
  <menu-button class="AddBlockDropdown">
    <template #button="{ toggle }">
      <div @click="toggle">
        <slot></slot>
      </div>
    </template>
    <add-block-menu-body
      @select="$emit('click', $event)"
      @paste-blocks="$emit('paste-blocks')"
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
});
</script>
<style lang="scss" scoped></style>
