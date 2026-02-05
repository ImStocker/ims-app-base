<template>
  <div
    class="BlockWithMenu"
    :data-dropdown-shown="isDropdownMenuShown ? true : undefined"
  >
    <context-menu-zone
      class="BlockWithMenu-content"
      :menu-list="menuList"
      :get-menu-list="getContextMenuList"
    >
      <slot></slot>
      <template
        v-for="slotName of Object.keys($slots)"
        :key="slotName"
        #[slotName]="slotData"
      >
        <slot :name="slotName" v-bind="slotData"></slot>
      </template>
    </context-menu-zone>
    <div
      v-if="menuList && menuList.length > 0"
      class="BlockWithMenu-menu ref-menu"
      :class="{
        'state-active': isDropdownMenuShown,
        ['BlockWithMenu-menu-position-' + menuPosition]: true,
      }"
      @click.stop
    >
      <div
        v-if="mainMenuList && mainMenuList.length > 0"
        class="BlockWithMenu-menu-main use-buttons-icon-small"
      >
        <template
          v-for="(item, idx) of mainMenuList"
          :key="'menu-main-item-' + (item.name ?? idx)"
        >
          <button
            v-if="!item.children?.length"
            class="is-button"
            :title="item.title"
            @click="item.action"
          >
            <i :class="item.icon"></i>
          </button>
          <menu-button
            v-else
            class="BlockWithMenu-menu-main-dropdown-button"
            @show="isDropdownMenuShown = true"
            @hide="isDropdownMenuShown = false"
          >
            <template #button="{ toggle }">
              <button class="is-button" :title="item.title" @click="toggle">
                <i :class="item.icon"></i>
              </button>
            </template>
            <menu-list :menu-list="item.children">
              <template
                v-for="slotName of Object.keys($slots)"
                :key="slotName"
                #[slotName]="slotData"
              >
                <slot :name="slotName" v-bind="slotData"></slot>
              </template>
            </menu-list>
          </menu-button>
        </template>
      </div>
      <div
        v-if="dropdownMenuList && dropdownMenuList.length > 0"
        class="BlockWithMenu-menu-additional"
      >
        <menu-button
          @show="isDropdownMenuShown = true"
          @hide="isDropdownMenuShown = false"
        >
          <menu-list :menu-list="dropdownMenuList"></menu-list>
        </menu-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type {
  ExtendedMenuListItem,
  MenuListItem,
} from '../../logic/types/MenuList';
import MenuButton from './MenuButton.vue';
import MenuList from './MenuList.vue';
import ContextMenuZone from './ContextMenuZone.vue';

export default defineComponent({
  name: 'BlockWithMenu',
  components: {
    MenuButton,
    MenuList,
    ContextMenuZone,
  },
  props: {
    menuList: {
      type: Array as PropType<ExtendedMenuListItem[]>,
      default: null,
    },
    menuPosition: {
      type: String as PropType<'reserved' | 'append' | 'float'>,
      default: 'reserved',
    },
    getContextMenuList: {
      type: [Function, null] as PropType<(() => MenuListItem[]) | null>,
      default: null,
    },
  },
  data() {
    return {
      isDropdownMenuShown: false,
    };
  },
  computed: {
    mainMenuList() {
      if (!this.menuList) return;
      return this.menuList.filter((el) => el.isMain);
    },
    dropdownMenuList() {
      if (!this.menuList) return;
      return this.menuList.filter((el) => !el.isMain);
    },
  },
});
</script>
<style lang="scss" scoped>
.BlockWithMenu {
  display: flex;
  position: relative;
}

.BlockWithMenu-content {
  width: 100%;
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.BlockWithMenu-menu {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  &.BlockWithMenu-menu-position-float {
    &:deep(.MenuButton-button.ref-button) {
      --button-bg-color: var(--local-bg-color);
    }
    position: absolute;
    right: 0;
  }

  &:not(.state-active) {
    &.BlockWithMenu-menu-position-float,
    &.BlockWithMenu-menu-position-reserved {
      opacity: 0;
    }
    &.BlockWithMenu-menu-position-append {
      display: none;
    }
  }
}

.BlockWithMenu-menu-main {
  display: flex;
}
.BlockWithMenu:hover {
  .BlockWithMenu-menu {
    &.BlockWithMenu-menu-position-append {
      display: flex;
    }
    &.BlockWithMenu-menu-position-float,
    &.BlockWithMenu-menu-position-reserved {
      opacity: 1;
    }
  }
}
.BlockWithMenu-menu-main-dropdown-button {
  display: flex;
}
</style>
