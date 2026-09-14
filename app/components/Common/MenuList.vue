<template>
  <ul class="MenuList is-dropdown" @keydown="onKeydown">
    <template
      v-for="(item, idx) in menuList"
      :key="'dropdown-item-' + (item.name ?? idx)"
    >
      <slot :name="'item-' + item.name" :item="item">
        <li
          v-if="!item.type || item.type !== 'separator'"
          class="MenuList-item use-buttons-dropdown-item"
          :data-menu-index="idx"
        >
          <component
            :is="getItemComponent(item)"
            v-if="!(item.children && item.children.length > 0)"
            v-pro-function="item.proFunction"
            :params="item.params"
            :name="item.params?.name"
            :to="item.params"
            class="is-button MenuList-item-inner"
            :class="{
              danger: item.danger,
              [item.cssClass!]: item.cssClass ?? undefined,
            }"
            :disabled="item.disabled"
            :attach-position="attachPosition"
            :title="item.tooltip ?? item.title"
            @click="handleClick(item)"
          >
            <div v-if="item.icon" class="MenuList-item-inner-icon">
              <i :class="getDropdownIconClass(item)"></i>
            </div>
            <div
              class="MenuList-item-inner-label"
              :class="{
                'white-space-left': hasAnyIcons && !item.icon,
                'white-space-right':
                  hasAnyChildren &&
                  (!item.children || !item.children.length) &&
                  attachPosition === 'right' &&
                  !hasExtraContentSlot(item),
              }"
            >
              <slot :name="'item-' + item.name + '-caption'">
                {{ item.title }}
              </slot>
            </div>
            <slot :name="'item-' + item.name + '-extra-content'"> </slot>
          </component>
          <menu-button
            v-else
            :ref="(el) => setSubmenuButtonRef(idx, el)"
            :attach-position="childrenAttachPosition"
          >
            <template #button="{ toggle }">
              <button
                class="is-button MenuList-item-inner"
                :disabled="item.disabled"
                :title="item.tooltip"
                @click="toggle"
              >
                <div
                  v-if="item.icon && attachPosition === 'right'"
                  class="MenuList-item-inner-icon"
                >
                  <i :class="getDropdownIconClass(item)"></i>
                </div>
                <div
                  v-if="attachPosition === 'left'"
                  class="MenuList-item-inner-icon drop-left"
                >
                  <i class="ri-arrow-left-s-line"></i>
                </div>
                <div
                  class="MenuList-item-inner-label"
                  :class="{
                    'white-space-left':
                      hasAnyIcons && !item.icon && attachPosition !== 'left',
                  }"
                >
                  {{ item.title }}
                </div>
                <div
                  v-if="attachPosition === 'right'"
                  class="MenuList-item-inner-icon drop-right"
                >
                  <i class="ri-arrow-right-s-line"></i>
                </div>
              </button>
            </template>
            <menu-list
              :ref="(el) => setSubmenuListRef(idx, el)"
              :menu-list="item.children"
              :close-submenu="() => onCloseSubmenu(idx)"
              @imc-menu-action-executed="
                dispatchMenuActionExecutedEvent($event.detail.item)
              "
            >
              <template
                v-for="slotName of Object.keys($slots)"
                :key="slotName"
                #[slotName]="slotData"
              >
                <slot :name="slotName" v-bind="slotData"></slot>
              </template>
            </menu-list>
          </menu-button>
        </li>
        <hr v-else class="MenuList-separator" />
      </slot>
    </template>
  </ul>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { MenuListItem } from '../../logic/types/MenuList';
import MenuButton from './MenuButton.vue';
import type { DropdownElementPlacement } from '../../logic/types/DropdownElement';
import ProjectLink from './ProjectLink.vue';
import { RouterLink } from 'vue-router';
import { getIconClass } from '../utils/ui';
import MenuLoader from './MenuLoader.vue';
import MenuLoadError from './MenuLoadError.vue';
import UiManager, { ScreenSize } from '../../logic/managers/UiManager';

export type MenuListSubmenuButton = {
  show(): void;
  hide(): void;
};

export type MenuListSubmenuRef = {
  focusFirstItem(): void;
};

export default defineComponent({
  name: 'MenuList',
  components: {
    MenuButton,
    ProjectLink,
  },
  props: {
    menuList: {
      type: Array as PropType<MenuListItem[]>,
      required: true,
    },
    attachPosition: {
      type: String as PropType<DropdownElementPlacement>,
      default: 'right',
    },
    closeSubmenu: {
      type: Function as PropType<(() => void) | null>,
      default: null,
    },
  },
  data() {
    return {
      submenuButtons: {} as Record<number, MenuListSubmenuButton>,
      submenuLists: {} as Record<number, MenuListSubmenuRef>,
    };
  },
  computed: {
    childrenAttachPosition() {
      if (this.isMobile) return 'bottom';
      return this.attachPosition;
    },
    isMobile() {
      return this.$getAppManager()
        .get(UiManager)
        .isScreenSize(ScreenSize.NOT_PC);
    },
    hasAnyIcons() {
      return this.menuList.some((item: MenuListItem) => {
        return (
          item.icon ||
          (item.children &&
            item.children.length > 0 &&
            this.attachPosition === 'left')
        );
      });
    },
    hasAnyChildren() {
      return this.menuList.some((item: MenuListItem) => {
        return item.children && item.children.length > 0;
      });
    },
  },
  methods: {
    getItemComponent(item: MenuListItem) {
      if (item.type && typeof item.type !== 'string') {
        return item.type;
      }
      switch (item.type) {
        case 'button':
        case undefined:
          return item.action ? 'button' : 'div';
        case 'project_link':
          return ProjectLink;
        case 'router_link':
          return RouterLink;
        case 'loader':
          return MenuLoader;
        case 'error':
          return MenuLoadError;
        default:
          return 'div';
      }
    },
    getDropdownIconClass(item: MenuListItem) {
      if (!item.icon) return;
      return getIconClass(item.icon, 'dropdown-icon-');
    },
    hasExtraContentSlot(item: MenuListItem) {
      return !!this.$slots['item-' + item.name + '-extra-content'];
    },
    handleClick(item: MenuListItem) {
      if (!item.action) return;
      item.action();
      if (!item.keepOpenOnClick) {
        this.dispatchMenuActionExecutedEvent(item);
      }
    },
    dispatchMenuActionExecutedEvent(item: MenuListItem) {
      if (!this.$el) return;
      const imcMenuActionExecuted = new CustomEvent(
        'imc-menu-action-executed',
        {
          bubbles: true,
          detail: { item },
        },
      );
      this.$el.dispatchEvent(imcMenuActionExecuted);
    },
    setSubmenuButtonRef(idx: number, el: unknown) {
      if (el) {
        this.submenuButtons[idx] = el as MenuListSubmenuButton;
      } else {
        delete this.submenuButtons[idx];
      }
    },
    setSubmenuListRef(idx: number, el: unknown) {
      if (el) {
        this.submenuLists[idx] = el as MenuListSubmenuRef;
      } else {
        delete this.submenuLists[idx];
      }
    },
    getFocusedItemIndex(target: EventTarget | null): number | null {
      const el = target as HTMLElement | null;
      const li = el?.closest?.('[data-menu-index]') as HTMLElement | null;
      if (!li) return null;
      const idx = Number(li.dataset.menuIndex);
      return Number.isNaN(idx) ? null : idx;
    },
    getMenuItems(): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll<HTMLElement>('.MenuList-item-inner'),
      ).filter((el) => {
        return (
          el.tabIndex >= 0 &&
          !el.hasAttribute('disabled') &&
          !(el as HTMLButtonElement).disabled
        );
      });
    },
    isEditableTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      return !!el?.closest?.(
        'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
      );
    },
    moveFocus(direction: 1 | -1) {
      const items = this.getMenuItems();
      if (items.length === 0) return;
      const focusedIdx = items.indexOf(document.activeElement as HTMLElement);
      let nextIdx =
        focusedIdx < 0
          ? direction > 0
            ? 0
            : items.length - 1
          : focusedIdx + direction;
      if (nextIdx < 0) nextIdx = items.length - 1;
      else if (nextIdx >= items.length) nextIdx = 0;
      items[nextIdx].focus();
    },
    focusFirstItem() {
      const items = this.getMenuItems();
      if (items.length > 0) items[0].focus();
    },
    openSubmenu(idx: number) {
      const button = this.submenuButtons[idx];
      if (!button) return;
      button.show();
      const tryFocusFirstItem = (attemptsLeft: number) => {
        const list = this.submenuLists[idx];
        if (list) {
          list.focusFirstItem();
        } else if (attemptsLeft > 0) {
          setTimeout(() => tryFocusFirstItem(attemptsLeft - 1), 16);
        }
      };
      this.$nextTick(() => tryFocusFirstItem(5));
    },
    onCloseSubmenu(idx: number) {
      const button = this.submenuButtons[idx];
      if (!button) return;
      button.hide();
      this.$nextTick(() => {
        const li = this.$el.querySelector<HTMLElement>(
          `[data-menu-index="${idx}"]`,
        );
        li?.querySelector<HTMLElement>('.MenuList-item-inner')?.focus();
      });
    },
    onKeydown(ev: KeyboardEvent) {
      if (this.isEditableTarget(ev.target)) return;
      const key = ev.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        this.moveFocus(key === 'ArrowUp' ? -1 : 1);
        ev.preventDefault();
      } else if (key === 'ArrowRight') {
        const idx = this.getFocusedItemIndex(ev.target);
        if (idx === null) return;
        const item = this.menuList[idx];
        if (item && item.children && item.children.length > 0) {
          this.openSubmenu(idx);
          ev.preventDefault();
        }
      } else if (key === 'ArrowLeft') {
        if (this.closeSubmenu) {
          this.closeSubmenu();
          ev.preventDefault();
        }
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.MenuList-separator {
  margin: 0;
  background-color: var(--dropdown-hl-bg-color);
  width: 100%;
  height: 1px;
  border: none;
}

.MenuList-item {
  &:last-child {
    .is-button {
      --button-border-radius: 0px 0px var(--dropdown-border-radius)
        var(--dropdown-border-radius) !important;
    }
  }

  &:first-child {
    .is-button {
      --button-border-radius: var(--dropdown-border-radius)
        var(--dropdown-border-radius) 0px 0px !important;
    }
  }

  &:first-child:last-child {
    .is-button {
      --button-border-radius: var(--dropdown-border-radius) !important;
    }
  }
}

div.MenuList-item-inner {
  --button-bg-color: var(--dropdown-hl-bg-color);
  cursor: default;
}

.MenuList-item-inner-label {
  text-align: left;
  text-wrap: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.white-space-left {
    padding-left: calc(var(--button-font-size) + var(--button-icon-gap));
  }

  &.white-space-right {
    padding-right: calc(var(--button-font-size) + var(--button-icon-gap));
  }
}

.MenuList-item-inner-icon {
  &.drop-right {
    margin-left: auto;
  }
}
</style>
