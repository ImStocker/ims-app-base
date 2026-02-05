<template>
  <div class="CollectionContent">
    <asset-editor-toolbar-widget
      v-if="!!userRole"
      class="CollectionContent-toolbar"
      :toolbar-vm="controller"
    ></asset-editor-toolbar-widget>
    <workspace-collection-manage-panel
      :vm="controller"
      :columns="gridColumns.list"
      @select-view="controller.setCurrentViewKey($event)"
    ></workspace-collection-manage-panel>
    <div
      v-if="controller.modifiedCurrentView.props?.length === 0"
      class="CollectionContent-warning"
    >
      {{ $t('viewSettings.noProps') }}
    </div>
    <div
      v-if="
        controller.isSaving() ||
        (controller.assetsContent.isLoading && !controller.initialLoad)
      "
      class="loaderBarFloat"
    ></div>
    <component
      :is="currentViewParams.component"
      v-if="currentViewParams"
      class="CollectionContent-table"
      :columns="filteredColumns"
      :vm="controller"
      :rows="rows"
      :workspace-id="controller.workspaceId"
      :view="controller.modifiedCurrentView"
      @column-click="changeSort($event)"
    >
    </component>
    <div
      v-if="controller.assetsContent.isLoading && controller.initialLoad"
      class="CollectionContent-loading"
    >
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div
      v-else-if="controller.assetsContent.loadingError"
      class="CollectionContent-loadingError"
    >
      {{ controller.assetsContent.loadingError }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcGridRow } from '../ImcGrid/ImcGrid';
import ImcGrid from '../ImcGrid/ImcGrid.vue';
import {
  applyPropsChange,
  castAssetPropValueToString,
} from '../../logic/types/Props';
import ProjectManager from '../../logic/managers/ProjectManager';
import CaptionString from '../Common/CaptionString.vue';
import type { SubscriberHandler } from '../../logic/types/Subscriber';
import type { AssetChangeDTO } from '../../logic/types/AssetsType';
import { makeFormStateFromProps } from '../../logic/utils/assets';
import ProjectLink from '../Common/ProjectLink.vue';
import WorkspaceCollectionManagePanel from '../Workspace/CollectionBlockManagePanel.vue';

import AssetEditorToolbarWidget from '../Asset/Editor/AssetEditorToolbarWidget.vue';
import { AssetRights } from '../../logic/types/Rights';
import type { WorkspaceCollectionColumn } from './WorkspaceCollectionContent';
import { gatherColumns } from './WorkspaceCollectionContent';
import type { ICollectionBlockController } from '~ims-plugin-base/blocks/CollectionBlock/CollectionBlockController';
import type { IAssetEditorToolbarVM } from '../../logic/vm/IAssetEditorToolbarVM';
import { VIEW_TYPES_MAP } from '../Workspace/ViewOptions/viewUtils';

export default defineComponent({
  name: 'CollectionContent',
  components: {
    ImcGrid,
    CaptionString,
    ProjectLink,
    WorkspaceCollectionManagePanel,
    AssetEditorToolbarWidget,
  },
  props: {
    controller: {
      type: Object as PropType<
        ICollectionBlockController & IAssetEditorToolbarVM
      >,
      required: true,
    },
  },
  data() {
    return {
      assetEventsSubscriber: null as SubscriberHandler | null,
      madeChanges: [] as Map<string, AssetChangeDTO>[],
    };
  },
  computed: {
    currentViewType() {
      return this.controller.currentView.type;
    },
    currentViewParams() {
      return VIEW_TYPES_MAP[this.currentViewType];
    },
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    gridColumns(): {
      list: WorkspaceCollectionColumn[];
      map: { [name: string]: WorkspaceCollectionColumn };
    } {
      let columns: WorkspaceCollectionColumn[] = [
        {
          name: 'title',
          differentDefinition: false,
          index: 0,
          multiple: false,
          params: {},
          propKey: 'title',
          propTitle: 'Title',
          type: 'collectionAssetTitle',
          pin: 'left',
          blockRef: '',
          width: 200,
          propName: '',
        },
      ];

      const base_asset = (this.controller as any)?.baseAsset;
      if (base_asset) {
        columns = [
          ...columns,
          ...gatherColumns(base_asset, this.$getAppManager()),
        ];
      }

      const list = columns.map((col) => {
        let type = col.type;
        if (type === 'text') {
          type = 'textCut';
        }
        return {
          ...col,
          type,
        };
      });

      return {
        list,
        map: Object.fromEntries(list.map((l) => [l.propKey, l])),
      };
    },
    filteredColumns() {
      const filtered_columns: WorkspaceCollectionColumn[] = [];
      for (const prop of this.controller.modifiedCurrentView.props) {
        const grid_column = this.gridColumns.map.hasOwnProperty(prop.prop)
          ? this.gridColumns.map[prop.prop]
          : null;
        if (grid_column) {
          let col = grid_column;
          if (prop.width) {
            col = { ...col, width: prop.width };
          }
          filtered_columns.push(col);
        }
      }
      return filtered_columns;
    },

    rows(): ImcGridRow[] {
      return this.controller.assetsContent.sortedItems.map((item) => {
        const asset_id = castAssetPropValueToString(item['id']);
        const dirty_change =
          this.controller.assetsContent.dirtyChanges.get(asset_id);
        let item_values = item;
        if (dirty_change) {
          item_values = applyPropsChange(
            item,
            null,
            dirty_change.changes,
          ).props;
        }

        const formState = makeFormStateFromProps(item_values);

        return {
          id: asset_id,
          values: this.filteredColumns.map((col) => {
            return {
              field: {
                ...col,
                readonly: (item.rights as number) <= AssetRights.COMMENT,
              },
              formState,
            };
          }),
        };
      });
    },
    /*where() {
      const where: AssetPropWhere = {};
      const filters = {};
      if (this.currentView?.filter) {
        for (const filter of this.currentView.filter) {
          filters[filter.prop] = filter.value;
        }
      }
      for (const col of this.gridColumns) {
        if (filters.hasOwnProperty(col.propKey) && filters[col.propKey]) {
          if (Array.isArray(filters[col.propKey])) {
            const from = filters[col.propKey][0] ?? null;
            const to = [col.propKey][1] ?? null;
            if (from !== null && to !== null) {
              where[col.propKey] = {
                op: AssetPropWhereOpKind.AND,
                v: [
                  {
                    [col.propKey]: {
                      op: AssetPropWhereOpKind.MORE_EQUAL,
                      v: from,
                    },
                  },
                  {
                    [col.propKey]: {
                      op: AssetPropWhereOpKind.LESS_EQUAL,
                      v: to,
                    },
                  },
                ],
              };
            } else if (from) {
              where[col.propKey] = {
                op: AssetPropWhereOpKind.MORE_EQUAL,
                v: from,
              };
            } else {
              where[col.propKey] = {
                op: AssetPropWhereOpKind.LESS_EQUAL,
                v: to,
              };
            }
          } else {
            where[col.propKey] = {
              op: AssetPropWhereOpKind.LIKE,
              v: `%${filters[col.propKey]}%`,
            };
          }
        }
      }

      return where;
    },*/
  },
  async mounted() {
    this.controller.assetsContent.init();
  },
  unmounted() {
    this.controller.assetsContent.destroy();
  },
  methods: {
    async changeSort(column: WorkspaceCollectionColumn) {
      const sort_option = this.controller.modifiedCurrentView.sort.find(
        (item) => item.prop === column.propKey,
      );
      let desc = false;
      if (sort_option) {
        const new_sort = this.controller.modifiedCurrentView.sort.filter(
          (item) => item.prop !== sort_option.prop,
        );
        if (sort_option.desc) {
          await this.controller.changeCurrentView('sort', new_sort);
          return;
        } else {
          desc = true;
        }
      }
      await this.controller.changeCurrentView('sort', [
        {
          prop: column.propKey ?? '',
          desc,
        },
      ]);
    },
  },
});
</script>

<style lang="scss" scoped>
.CollectionContent-loading {
  display: flex;
  align-items: center;
  gap: 5px;
  .loaderSpinner {
    font-size: 14px;
  }
}

.CollectionContent-loadingError {
  color: var(--color-main-error);
}

.CollectionContent-table {
  margin-bottom: 5px;
}

.CollectionContent-warning {
  width: 100%;
  text-align: center;
  padding: 15px;
  border: 1px solid var(--local-link-color);
  border-radius: 4px;
  margin-bottom: 10px;
}
</style>
