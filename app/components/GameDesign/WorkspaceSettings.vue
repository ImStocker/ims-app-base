<template>
  <menu-button v-if="menuList.length > 0" class="WorkspaceSettings">
    <template #button="{ toggle }">
      <button
        class="is-button is-button-icon ref-button WorkspaceSettings-button"
        :title="$t('gddPage.settings')"
        @click="toggle"
      >
        <i class="ri-settings-3-line WorkspaceSettings-icon"></i>
      </button>
    </template>
    <menu-list :menu-list="menuList">
      <template
        v-for="(_, slotName) of $slots"
        #[slotName]="slotData"
        :key="slotName"
      >
        <slot :name="slotName" v-bind="slotData ?? {}"></slot>
      </template>
    </menu-list>
  </menu-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import MenuButton from '../Common/MenuButton.vue';
import MenuList from '../Common/MenuList.vue';
import type { ExtendedMenuListItem } from '../../logic/types/MenuList';

export default defineComponent({
  name: 'WorkspaceSettings',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    menuList: {
      type: Array as PropType<ExtendedMenuListItem[]>,
      default: () => [],
    },
  },
});
</script>

<style lang="scss" scoped>
.WorkspaceSettings-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--local-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}
.WorkspaceSettings-icon {
  font-size: 17px;
}
</style>
