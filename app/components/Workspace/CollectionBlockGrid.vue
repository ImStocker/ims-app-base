<template>
  <div class="CollectionBlockGrid">
    <imc-grid
      v-if="rows.length > 0"
      class="CollectionBlockGrid-grid"
      :allow-resize-columns="true"
      :rows="rows"
      :columns="columns"
      :get-body-cell-class="getBodyCellClass"
      @resize-column="onColumnResize"
      @change-cells="changeCells"
      @handle-key="handleGridKey($event)"
      @column-click="$emit('column-click', $event)"
    >
      <template
        v-for="column of columns"
        :key="column.name"
        #[`header-${column.name}`]
      >
        <div
          class="WorkspaceCollectionContent-header-common-cell"
          @click="$emit('column-click', column)"
        >
          <caption-string
            class="WorkspaceCollectionContent-header-cell"
            :value="column.propTitle"
          ></caption-string>
          <i
            v-if="getColumnSort(column) === false"
            class="ri-arrow-up-s-fill"
          ></i>
          <i v-if="getColumnSort(column)" class="ri-arrow-down-s-fill"></i>
        </div>
      </template>
    </imc-grid>
    <div
      v-if="userRole"
      class="CollectionBlockGrid-controls use-buttons-action"
    >
      <button
        class="is-button"
        :class="{
          loading: vm.assetsContent.addBusy,
        }"
        @click="addRow"
      >
        {{ $t('sourcePage.folders.collection.addRow') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import type { HandleKeyEvent } from '../ImcGrid/ImcGrid.vue';
import ImcGrid from '../ImcGrid/ImcGrid.vue';
import CaptionString from '../Common/CaptionString.vue';
import ConfirmDialog from '../Common/ConfirmDialog.vue';
import DialogManager from '../../logic/managers/DialogManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import UiManager from '../../logic/managers/UiManager';
import { AssetRights } from '../../logic/types/Rights';
import type { SetClickOutsideCancel } from '../utils/ui';
import { setImsClickOutside } from '../utils/ui';
import type { WorkspaceCollectionPageVM } from '../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { WorkspaceContentControllerChangeItem } from '../../logic/vm/Workspace/WorkspaceContentController';
import type {
  ImcGridColumn,
  ImcGridRow,
  ImcGridChangeCell,
} from '../ImcGrid/ImcGrid';

export default defineComponent({
  name: 'CollectionBlockGrid',
  components: { ImcGrid, CaptionString },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    rows: { type: Array<ImcGridRow>, required: true },
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
  },
  emits: ['column-click'],
  data() {
    return {
      clickOutside: null as SetClickOutsideCancel | null,
      addBusy: false,
      savingBusy: false,
    };
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    hasChanges() {
      return this.vm.getHasChanges();
    },
  },
  watch: {
    hasChanges() {
      this.resetGlobalClickOutside(this.hasChanges);
    },
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
  },
  methods: {
    resetGlobalClickOutside(restart: boolean) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart) {
        this.clickOutside = setImsClickOutside(this.$el, () => {
          this.vm.saveChanges();
        });
      }
    },
    getBodyCellClass(
      row: ImcGridRow,
      _row_index: number,
      col_index: number,
    ): Record<string, boolean> {
      if (this.vm.assetsContent.isItemRecentlyAdded(row.id)) {
        return {
          'CollectionBlockGrid-cell-added': true,
        };
      } else {
        const column = this.columns[col_index];
        if (this.vm.assetsContent.isItemPropDirty(row.id, column.propKey)) {
          return {
            'CollectionBlockGrid-cell-changed': true,
          };
        }
      }
      return {};
    },
    getColumnSort(column: ImcGridColumn) {
      if (this.vm.modifiedCurrentView.sort.length === 0) return null;
      const sort_option = this.vm.modifiedCurrentView.sort[0];
      if (sort_option.prop !== column.propKey) return null;
      if (sort_option) {
        return sort_option.desc;
      }
      return null;
    },
    async handleGridKey(event: HandleKeyEvent) {
      if (event.key === 'Delete') {
        const deleting_asset_ids = new Set<string>();
        for (const selected_range of event.selectedRanges) {
          if (
            selected_range.colTo === this.columns.length &&
            selected_range.colFrom === 0
          ) {
            for (
              let i = selected_range.rowFrom;
              i < selected_range.rowTo;
              i++
            ) {
              const row = this.rows[i];
              const asset_id = row.id;
              const asset_item = this.vm.assetsContent.items.find(
                (it) => it.id === asset_id,
              );
              if (
                asset_item &&
                (asset_item.rights as number) >= AssetRights.FULL_ACCESS
              ) {
                deleting_asset_ids.add(row.id);
              }
            }
          }
        }
        if (deleting_asset_ids.size === 0) return;
        event.handled = true;

        const answer = await this.$getAppManager()
          .get(DialogManager)
          .show(
            ConfirmDialog,
            {
              header: this.$t('sourcePage.elements.deleteElements') + '?',
              message: this.$t('sourcePage.elements.deleteElementsConfirm', {
                count: deleting_asset_ids.size,
              }),
              yesCaption: this.$t('common.dialogs.delete'),
              danger: true,
            },
            this,
          );
        if (!answer) return;

        await this.$getAppManager()
          .get(UiManager)
          .doTask(async () => {
            await this.vm.assetsContent.deleteItemsByIds([
              ...deleting_asset_ids,
            ]);
          });
      }
    },
    async addRow() {
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.vm.assetsContent.addItem();
        });
    },

    onColumnResize(ev: { name: string; width: number }) {
      const current_view = this.vm.modifiedCurrentView;
      const prop_index = current_view.props.findIndex(
        (p) => p.prop === ev.name,
      );
      if (prop_index < 0) return;
      const new_props = [...current_view.props];
      new_props[prop_index] = {
        ...new_props[prop_index],
        width: ev.width,
      };
      this.vm.changeCurrentView('props', new_props);
    },

    async changeCells(changes: ImcGridChangeCell[]) {
      const changes_map = new Map<
        string,
        WorkspaceContentControllerChangeItem
      >();
      for (const change of changes) {
        if (!change.row) continue;
        if (!change.field) continue;

        let change_record = changes_map.get(change.row.id);
        if (!change_record) {
          change_record = {
            assetId: change.row.id,
            changes: [],
          };
          changes_map.set(change.row.id, change_record);
        }
        change_record.changes = [...change_record.changes, ...change.changes];
      }
      if (changes_map.size === 0) return;

      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await this.vm.assetsContent.changeItems([...changes_map.values()]);
        });
    },
  },
});
</script>

<style lang="scss" scoped>
.CollectionBlockGrid-grid {
  margin-bottom: 10px;
}
.WorkspaceCollectionContent-header-common-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.WorkspaceCollectionContent-header-cell {
  padding: 5px;
  font-weight: 500;
}
</style>

<style lang="scss">
body[data-theme='ims-dark'] {
  .CollectionBlockGrid-cell-added {
    background: rgb(58, 235, 106, 0.03) !important;
  }
  .CollectionBlockGrid-cell-changed {
    background: rgb(58, 144, 235, 0.07) !important;
  }
}
body[data-theme='ims-light'] {
  .CollectionBlockGrid-cell-added {
    background: rgb(58, 235, 106, 0.1) !important;
  }
  .CollectionBlockGrid-cell-changed {
    background: rgba(58, 102, 235, 0.1) !important;
  }
}
</style>
