<template>
  <menu-button class="AddBlockDropdown">
    <template #button="{ toggle }">
      <div @click="toggle">
        <slot></slot>
      </div>
    </template>
    <menu-list class="AddBlockDropdown-list" :menu-list="menuList"></menu-list>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuList from '../../Common/MenuList.vue';
import MenuButton from '../../Common/MenuButton.vue';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AddBlockDropdown',
  components: {
    MenuList,
    MenuButton,
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
  emits: ['click'],
  computed: {
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    menuList() {
      return this.blockTypes.map((block) => {
        return {
          title: this.$t('blockTypes.titles.' + block.name),
          icon: 'ri-' + block.icon,
          action: () => this.$emit('click', block.name),
        };
      });
    },
  },
});
</script>
<style lang="scss" scoped></style>
