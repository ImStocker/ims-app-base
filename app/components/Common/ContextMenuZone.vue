<template>
  <div
    ref="contextMenuZone"
    class="ContextMenuZone"
    @contextmenu="onContextMenu($event as any)"
  >
    <div
      v-if="contextMenu.shown && menuListComp"
      class="ContextMenuZone-target"
      :style="{
        top: `${contextMenu.y}px`,
        left: `${contextMenu.x}px`,
      }"
    >
      <dropdown-element
        v-model:shown="contextMenu.shown"
        class="ContextMenuZone-dropdown"
      >
        <menu-list
          :menu-list="menuListComp"
          @imc-menu-action-executed="contextMenu.shown = false"
        >
          <template
            v-for="slotName of Object.keys($slots)"
            :key="slotName"
            #[slotName]="slotData"
          >
            <slot :name="slotName" v-bind="slotData"></slot>
          </template>
        </menu-list>
      </dropdown-element>
    </div>
    <slot></slot>
  </div>
</template>
<script lang="ts" type="text/ecmascript-6">
import { defineComponent, type PropType } from 'vue';
import MenuList from './MenuList.vue';
import type { MenuListItem } from '../../logic/types/MenuList';
import DropdownElement from './DropdownElement.vue';

export default defineComponent({
  name: 'ContextMenuZone',
  components: {
    MenuList,
    DropdownElement,
  },
  props: {
    menuList: {
      type: Array as PropType<MenuListItem[]>,
      default: null,
    },
    ignoringCssSelector: {
      type: String,
      default: null,
    },
    getMenuList: {
      type: [Function, null] as PropType<(() => MenuListItem[]) | null>,
      default: null,
    },
  },
  emits: ['dropdown-state-change'],
  data() {
    return {
      dropdownShown: false,
      contextMenu: {
        shown: false,
        x: 0,
        y: 0,
      },
    };
  },
  computed: {
    menuListComp() {
      if (this.getMenuList) {
        return this.getMenuList();
      }
      return this.menuList;
    },
    contextMenuRect() {
      const element = this.$refs.contextMenuZone as HTMLElement;
      if (!element) return;
      return element.getBoundingClientRect();
    },
  },
  watch: {
    'contextMenu.shown'() {
      this.$emit('dropdown-state-change', this.contextMenu.shown);
    },
  },
  methods: {
    onContextMenu(event: PointerEvent | TouchEvent) {
      if (!this.contextMenuRect) return;
      if (
        this.ignoringCssSelector &&
        event.target &&
        (event.target as HTMLElement).closest(this.ignoringCssSelector)
      ) {
        return;
      }
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      event.preventDefault();

      let clientX;
      let clientY;

      if (event instanceof PointerEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      }

      this.contextMenu.x = clientX - this.contextMenuRect.left;
      this.contextMenu.y = clientY - this.contextMenuRect.top;
      this.contextMenu.shown = true;
      event.stopPropagation();
    },
  },
});
</script>
<style lang="scss" scoped>
.ContextMenuZone {
  flex: 1;
  position: relative;
}

.ContextMenuZone-target {
  position: absolute;
  width: 0px;
  height: 0px;
}
</style>
