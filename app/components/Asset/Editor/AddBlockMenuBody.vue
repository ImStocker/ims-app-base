<template>
  <div class="AddBlockMenuBody tiny-scrollbars">
    <div class="AddBlockMenuBody-search">
      <form-search
        ref="search"
        :value="searchText"
        :placeholder="$t('assetEditor.searchBlocks')"
        @change="onSearchChange"
        @keydown="onSearchKeydown"
      ></form-search>
    </div>
    <menu-list
      ref="menu"
      class="AddBlockMenuBody-list"
      :menu-list="menuList"
    ></menu-list>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import FormSearch from '../../Form/FormSearch.vue';
import MenuList from '../../Common/MenuList.vue';
import EditorManager from '../../../logic/managers/EditorManager';
import type { MenuListItem } from '../../../logic/types/MenuList';
import type { BlockTypeDefinition } from '../../../logic/types/BlockTypeDefinition';

export default defineComponent({
  name: 'AddBlockMenuBody',
  components: {
    FormSearch,
    MenuList,
  },
  emits: ['select', 'paste-blocks', 'cancel'],
  data() {
    return {
      searchText: '',
      expandedGroups: {} as Record<string, boolean>,
    };
  },
  computed: {
    blockTypes(): BlockTypeDefinition[] {
      return this.$getAppManager()
        .get(EditorManager)
        .getBlockTypesList()
        .filter((x) => !x.hideInAdding);
    },
    searchTextLower() {
      return this.searchText.trim().toLowerCase();
    },
    foundBlocks(): BlockTypeDefinition[] {
      if (this.searchTextLower) {
        return this.blockTypes
          .filter((b) => this.matchesSearch(b))
          .sort((a, b) => a.index - b.index);
      } else {
        return this.standaloneBlocks;
      }
    },
    menuList(): MenuListItem[] {
      const list: MenuListItem[] = [];

      if (this.searchTextLower) {
        const flat = this.foundBlocks;
        for (const b of flat) {
          list.push(this.toBlockItem(b));
        }
      } else {
        for (const b of this.standaloneBlocks) {
          list.push(this.toBlockItem(b));
        }
        for (const group of ['data', 'editors', 'other'] as const) {
          const members = this.blockTypes
            .filter((b) => b.group === group)
            .sort((a, b) => a.index - b.index);
          if (!members.length) continue;
          const expanded = !!this.expandedGroups[group];
          list.push({
            name: 'group-' + group,
            title: this.$t('blockTypes.groups.' + group),
            icon: expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line',
            cssClass: 'AddBlockMenuBody-group-header',
            keepOpenOnClick: true,
            action: () => this.toggleGroup(group),
          });
          if (expanded) {
            for (const b of members) {
              list.push(this.toBlockItem(b, 'AddBlockMenuBody-group-item'));
            }
          }
        }
      }

      list.push(
        {
          type: 'separator',
          name: 'add-block-separator',
        },
        {
          name: 'paste-blocks',
          title: this.$t('assetEditor.pasteBlocks'),
          icon: 'ri-clipboard-line',
          action: () => this.$emit('paste-blocks'),
        },
      );
      return list;
    },
    standaloneBlocks(): BlockTypeDefinition[] {
      return this.blockTypes
        .filter((b) => b.group === null)
        .sort((a, b) => a.index - b.index);
    },
  },
  mounted() {
    setTimeout(() => {
      this.focusSearch();
    }, 100);
  },
  methods: {
    onSearchKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        this.$emit('cancel');
      } else if (e.key === 'Enter' && this.foundBlocks.length > 0) {
        this.$emit('select', this.foundBlocks[0].name);
      } else if (e.key === 'ArrowDown') {
        const menu = this.$refs['menu'] as InstanceType<typeof MenuList> | null;
        if (menu) menu.focusFirstItem();
      }
    },
    onSearchChange(val: string) {
      this.searchText = val;
    },
    matchesSearch(block: BlockTypeDefinition): boolean {
      const q = this.searchTextLower;
      if (!q) return true;
      return (
        this.plainTitle(block).toLowerCase().includes(q) ||
        (block.name ?? '').toLowerCase().includes(q)
      );
    },
    plainTitle(block: BlockTypeDefinition): string {
      return this.$t('blockTypes.titles.' + block.name);
    },
    displayTitle(block: BlockTypeDefinition): string {
      let title = this.plainTitle(block);
      if (block.deprecated) {
        title += ` (${this.$t('blockTypes.deprecated')})`;
      }
      return title;
    },
    toBlockItem(block: BlockTypeDefinition, cssClass?: string): MenuListItem {
      return {
        name: block.name,
        title: this.displayTitle(block),
        icon: block.icon.startsWith('ri-') ? block.icon : 'ri-' + block.icon,
        cssClass: cssClass ?? undefined,
        action: () => this.$emit('select', block.name),
      };
    },
    toggleGroup(group: string) {
      this.expandedGroups = {
        ...this.expandedGroups,
        [group]: !this.expandedGroups[group],
      };
    },
    focusSearch() {
      (
        this.$refs.search as InstanceType<typeof FormSearch> | undefined
      )?.focus();
    },
  },
});
</script>
<style lang="scss" scoped>
.AddBlockMenuBody {
  width: var(--DropdownContainer-attachToElement-width);
  max-height: 60vh;
  overflow-y: auto;
}

.AddBlockMenuBody-search {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 8px 4px;
  background: var(--dropdown-bg-color);
  border-top-left-radius: var(--dropdown-border-radius);
  border-top-right-radius: var(--dropdown-border-radius);
}

.AddBlockMenuBody-list.is-dropdown {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

:deep(.AddBlockMenuBody-group-header) {
  --button-bg-color: transparent;

  &:hover {
    --button-bg-color: color-mix(
      in srgb,
      var(--dropdown-hl-bg-color) 50%,
      transparent
    );
  }
}

:deep(.AddBlockMenuBody-group-item) {
  padding-left: calc(var(--button-padding-left, 1em) + 1em);
}
</style>
