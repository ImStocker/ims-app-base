<template>
  <div class="SelectAssetListBox">
    <project-tree-search
      ref="search"
      v-model="searchValueOwn"
      :autofocus="autofocus"
      class="SelectAssetListBox-search"
    ></project-tree-search>
    <div class="SelectAssetListBox-allOptions">
      <div class="SelectAssetListBox-items tiny-scrollbars">
        <project-tree-presenter
          :show-asset-inheritance="true"
          :asset-where="projectTreeWhere"
          :selection="curSelection"
          selection-mode="single"
          :additional-options="additionalOptions"
          :hide-non-alternative-workspaces="!!searchValueOwn"
          :hide-empty-workspaces="true"
          :allow-select-workspaces="false"
          @update:selection="changeValue($event[0])"
          @item:click="onItemClick"
        ></project-tree-presenter>
      </div>
      <div v-if="$slots.append" class="SelectAssetListBox-append">
        <slot name="append"></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ProjectTreePresenter from './ProjectTree/ProjectTreePresenter.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
} from '../../logic/types/PropsWhere';
import ProjectTreeSearch from './ProjectTree/ProjectTreeSearch.vue';
import type { AssetPropValueSelection } from '../../logic/types/Props';
import type { ProjectTreeSelectedItem } from '../../logic/vm/IProjectTreePresenterVM';
import type { TreePresenterItemEvent } from '../Common/TreePresenter/TreePresenter';
import { getWorkspaceCollectionAsset } from '../GameDesign/workspaceUtils';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import type { ProjectTreeItemPayload } from './ProjectTree/ProjectTreePresenterBaseVM';

export default defineComponent({
  name: 'SelectAssetListBox',
  components: {
    ProjectTreePresenter,
    ProjectTreeSearch,
  },
  props: {
    modelValue: {
      type: Object as PropType<AssetForSelection | null>,
      required: false,
      default: null,
    },
    searchValue: {
      type: [Object, null] as PropType<AssetPropValueSelection | null>,
      default: null,
    },
    where: {
      type: [Object, null] as PropType<AssetPropWhere | null>,
      default: null,
    },
    additionalOptions: {
      type: Array<AssetForSelection>,
      default: () => [],
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    autofocus: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'update:searchValue'],
  data() {
    return {
      searchValueOwn: this.searchValue,
    };
  },
  computed: {
    curSelection(): ProjectTreeSelectedItem[] {
      if (this.modelValue) {
        return [{ id: this.modelValue.id, type: 'asset' }];
      }
      return [];
    },
    projectTreeWhere(): AssetPropWhere {
      let res = this.where ? this.where : {};
      if (this.searchValueOwn) {
        res = {
          ...res,
          search: {
            op: AssetPropWhereOpKind.AND,
            v: [this.searchValueOwn.Where],
          },
        };
      }
      return res;
    },
  },
  watch: {
    searchText() {
      if (
        JSON.stringify(this.searchValueOwn) !== JSON.stringify(this.searchValue)
      ) {
        this.searchValueOwn = this.searchValue;
      }
    },
    searchTextOwn() {
      if (
        JSON.stringify(this.searchValueOwn) !== JSON.stringify(this.searchValue)
      ) {
        this.$emit('update:searchValue', this.searchValue);
      }
    },
  },
  methods: {
    changeValue(ev: AssetForSelection | null) {
      this.$emit('update:modelValue', ev);
    },
    focusInSearch() {
      if (!this.$refs.search) return;
      (this.$refs.search as InstanceType<typeof ProjectTreeSearch>).focus();
    },
    async onItemClick(e: TreePresenterItemEvent<ProjectTreeItemPayload>) {
      // Select collection's bound asset
      if (e.target.item.payload.type !== 'workspace') {
        return;
      }
      const workspace = await this.$getAppManager()
        .get(CreatorAssetManager)
        .getWorkspaceByIdViaCache(e.target.item.payload.id);
      if (!workspace) {
        return;
      }

      const workspace_collection_item = getWorkspaceCollectionAsset(workspace);
      if (!workspace_collection_item) {
        return;
      }

      const asset = await this.$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortViaCache(workspace_collection_item.AssetId);
      if (!asset) {
        return;
      }
      const match = this.where
        ? await this.$getAppManager()
            .get(CreatorAssetManager)
            .matchAssetShortsWithWhere([asset], this.where)
        : [asset];
      if (match.length === 0) {
        return;
      }

      this.changeValue({
        icon: asset.icon,
        id: asset.id,
        name: asset.name,
        title: asset.title,
      });
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

.SelectAssetListBox {
  --SelectAssetListBox-itemsHeight: 125px;
}

.SelectAssetListBox-search {
  margin-bottom: 12px;
}

.SelectAssetListBox-asset-icon {
  margin-right: 5px;
  @include asset-icons.asset-icons;
}

.SelectAssetListBox-items {
  display: flex;
  gap: 8px;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}
.SelectAssetListBox-allOptions {
  display: flex;
  flex-direction: column;
  height: var(--SelectAssetListBox-itemsHeight);
}

.SelectAssetListBox-append {
  border: none;
  border-top: 1px solid var(--local-text-color);
  margin-top: 10px;
  padding-top: 10px;
}
</style>
