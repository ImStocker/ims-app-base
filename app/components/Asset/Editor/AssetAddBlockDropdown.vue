<template>
  <menu-button class="AddBlockDropdown">
    <template #button="{ toggle }">
      <button class="AddBlockDropdown-button" @click="toggle">
        <i class="ri-add-box-fill"></i>
        {{ $t('gddPage.addBlock') }}
      </button>
    </template>
    <menu-list class="AddBlockDropdown-list" :menu-list="menuList"></menu-list>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import MenuButton from '../../Common/MenuButton.vue';
import MenuList from '../../Common/MenuList.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import type { MenuListItem } from '../../../logic/types/MenuList';

export default defineComponent({
  name: 'AddBlockDropdown',
  components: {
    MenuButton,
    MenuList,
  },
  emits: ['create-block', 'paste-blocks'],
  computed: {
    blockTypes() {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding)
        .sort((a, b) => {
          return (a.deprecated ? 1 : 0) - (b.deprecated ? 1 : 0);
        });
    },
    menuList(): MenuListItem[] {
      const list: MenuListItem[] = this.blockTypes.map((block) => {
        let title = block.title
          ? block.title
          : this.$t('blockTypes.titles.' + block.name);
        if (block.deprecated) {
          title += ` (${this.$t('blockTypes.deprecated')})`;
        }
        return {
          title,
          icon: block.icon.startsWith('ri-') ? block.icon : 'ri-' + block.icon,
          action: () => this.$emit('create-block', block.name),
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
<style lang="scss">
.AddBlockDropdown-list {
  width: var(--DropdownContainer-attachToElement-width);
}
</style>
<style lang="scss" scoped>
.AddBlockDropdown {
  font-family: var(--local-font-family);
  font-size: var(--local-font-size);
  font-weight: 500;
  text-transform: none;
  margin: 0px var(--editor-block-padding-right) 0
    var(--editor-block-padding-left);

  .AddBlockDropdown-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border: 1.5px dashed var(--local-border-color);
    border-radius: 12px;
    background: transparent;
    color: var(--local-sub-text-color);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease,
      background 0.15s ease;

    i {
      font-size: 17px;
    }

    &:hover,
    &.is-open {
      color: var(--color-accent);
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    }
  }
}
</style>
