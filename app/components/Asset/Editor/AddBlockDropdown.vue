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
import type { MenuListItem } from '../../../logic/types/MenuList';

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
  emits: ['click', 'paste-blocks'],
  computed: {
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    menuList(): MenuListItem[] {
      const list: MenuListItem[] = this.blockTypes.map((block) => {
        return {
          title: this.$t('blockTypes.titles.' + block.name),
          icon: 'ri-' + block.icon,
          action: () => this.$emit('click', block.name),
        };
      });
      list.push(
        {
          type: 'separator',
        },
        {
          title: this.$t('assetEditor.pasteBlocks'),
          icon: 'ri-clipboard-line',
          action: () => this.$emit('paste-blocks'),
        },
      );
      return list;
    },
  },
});
</script>
<style lang="scss" scoped></style>
