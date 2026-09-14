<template>
  <div class="AddBlockMenuBody">
    <div class="AddBlockMenuBody-search">
      <form-search
        ref="search"
        :value="searchText"
        :placeholder="$t('assetEditor.searchBlocks')"
        @change="onSearchChange"
      ></form-search>
    </div>
    <menu-list class="AddBlockMenuBody-list" :menu-list="menuList"></menu-list>
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
  emits: ['select', 'paste-blocks'],
  data() {
    return {
      searchText: '',
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
    menuList(): MenuListItem[] {
      const list: MenuListItem[] = [];

      if (this.searchTextLower) {
        const flat = this.blockTypes
          .filter((b) => this.matchesSearch(b))
          .sort((a, b) => a.index - b.index);
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
          list.push({
            name: 'group-' + group,
            title: this.$t('blockTypes.groups.' + group),
            icon: 'ri-folder-3-line',
            children: members.map((b) => this.toBlockItem(b)),
          });
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
      return block.title
        ? block.title
        : this.$t('blockTypes.titles.' + block.name);
    },
    displayTitle(block: BlockTypeDefinition): string {
      let title = this.plainTitle(block);
      if (block.deprecated) {
        title += ` (${this.$t('blockTypes.deprecated')})`;
      }
      return title;
    },
    toBlockItem(block: BlockTypeDefinition): MenuListItem {
      return {
        name: block.name,
        title: this.displayTitle(block),
        icon: block.icon.startsWith('ri-') ? block.icon : 'ri-' + block.icon,
        action: () => this.$emit('select', block.name),
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
}
</style>
