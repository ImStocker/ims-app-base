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
import { defineComponent, inject } from 'vue';
import MenuList from '../../Common/MenuList.vue';
import MenuButton from '../../Common/MenuButton.vue';
import EditorSubContext from '../../../logic/project-sub-contexts/EditorSubContext';
import { assert } from '#logic/utils/typeUtils';
import { injectedProjectContext } from '#logic/types/IProjectContext';

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
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  computed: {
    blockTypes() {
      return this.projectContext
        .get(EditorSubContext)
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
