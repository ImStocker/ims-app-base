<template>
  <value-table-block-print
    v-if="displayMode === 'print'"
    class="AssetEditorValueTableBlock"
    :table-data="tableData"
    :asset-block-editor="assetBlockEditor"
    :asset-changer="assetChanger"
    :resolved-block="resolvedBlock"
  ></value-table-block-print>
  <div
    v-else
    class="AssetEditorValueTableBlock"
    @click="enterEditMode($event)"
    @mouseover="onTableMouseEnter"
    @mouseout="onTableMouseLeave"
  >
    <imc-grid
      :columns="tableData.columns"
      :rows="
        tableData.rows.map((row) => {
          return {
            id: row.id,
            values: row.columns.map((col) => {
              return {
                field: col,
                formState: tableData.values,
              };
            }),
          };
        })
      "
      :allow-resize-columns="!readonly"
      :readonly="readonly"
      @change-cells="changeCells($event)"
      @resize-column="onColumnResize"
      @update:selected-ranges="onSelectionUpdated"
    >
      <template
        v-for="column of tableData.columns"
        :key="column.name"
        #[`header-${column.name}`]
      >
        <props-block-prop
          class="AssetEditorValueTableBlock-header-cell"
          :edit-mode="editMode"
          :computed-state="true"
          :same-value="true"
          :model-value="column.propTitle"
          :validate-value="validateColumnTitle"
          @update:model-value="setColumnTitleAndName(column, $event)"
          @click="changeSettingsColumnIfOpened(column.name)"
        >
          <template v-if="!readonly && column.name !== tableData.primary" #menu>
            <menu-button
              class="AssetEditorValueTableBlock-header-cell-menu"
              :class="{
                'state-active': column.index === shownDropdownMenuColumnIdx,
              }"
              @show="shownDropdownMenuColumnIdx = column.index"
              @hide="shownDropdownMenuColumnIdx = null"
            >
              <menu-list :menu-list="getColumnMenuList(column)"></menu-list>
            </menu-button>
          </template>
        </props-block-prop>
      </template>
    </imc-grid>

    <overlay-element
      v-if="
        editMode &&
        hoveringCell &&
        hoveringCell.element &&
        tableData.columns.length > 0 &&
        hoveringCell.colName === tableData.columns[0].name &&
        !readonly
      "
      :attach-to-element="hoveringCell.element"
      attach-position="left"
      class="AssetEditorValueTableBlock-addRow"
      @mouseleave="onAddRowOverlayMouseLeave"
    >
      <menu-button
        v-if="hoveringCellRowIndex >= 0 && tableData.rows[hoveringCellRowIndex]"
        class="AssetEditorValueTableBlock-row-cell-menu"
      >
        <template #button="{ show }">
          <button class="is-button is-button-icon-small" @click="show">
            <i class="ri-edit-box-fill"></i>
          </button>
        </template>
        <menu-list
          :menu-list="rowMenuList"
          @mouseleave="onAddRowOverlayMouseLeave"
        ></menu-list>
      </menu-button>
      <button
        class="is-button is-button-icon-small"
        :title="$t('assetEditor.tableBlockAddRowAfter')"
        @click="addRowButton()"
      >
        <i class="ri-add-box-fill"></i>
      </button>
    </overlay-element>
    <overlay-element
      v-if="
        editMode &&
        hoveringCell &&
        hoveringCell.element &&
        !hoveringCell.rowId &&
        !readonly
      "
      :attach-to-element="hoveringCell.element"
      attach-position="top"
      class="AssetEditorValueTableBlock-addColumn"
      @mouseleave="onAddRowOverlayMouseLeave"
    >
      <button
        :title="$t('assetEditor.tableBlockAddColumnAfter')"
        class="is-button is-button-icon-small"
        @click="addColumnButton(hoveringCell.colName)"
      >
        <i class="ri-add-box-fill"></i>
      </button>
    </overlay-element>
    <right-panel v-if="changingSettingsColumnName && changingSettingsColumn">
      <value-table-column-change-settings
        class="AssetEditorValueTableBlock-changeSettingsColumnProp"
        :form-state="tableData.values"
        :prop-key="changingSettingsColumnName"
        :asset-changer="assetChanger"
        :resolved-block="resolvedBlock"
        :props-count="tableData.columns.length"
        @save="save()"
        @rename-prop="setColumnTitleAndName(changingSettingsColumn, $event)"
        @move-settings-prop="switchSettingsColumn($event)"
        @change-service-name="
          askChangeServiceNameColumn(changingSettingsColumn)
        "
      ></value-table-column-change-settings>
    </right-panel>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import {
  getClosestNodeBySelector,
  isElementInteractive,
} from '#components/utils/DomElementUtils';
import {
  AssetPropType,
  assignSubObjectToAssetProps,
  castAssetPropValueToString,
  makeBlockRef,
  normalizeAssetPropPart,
  type AssetPropValue,
} from '#logic/types/Props';
import { AssetRights } from '#logic/types/Rights';
import type { AssetBlockEditorVM } from '#logic/vm/AssetBlockEditorVM';
import type { AssetDisplayMode, ResolvedAssetBlock } from '#logic/utils/assets';
import {
  extractValueTableBlockData,
  type ValueTableBlockColumn,
  type ValueTableBlockData,
  type ValueTableBlockRowData,
} from './ValueTableBlock';
import { v4 as uuidv4 } from 'uuid';
import OverlayElement from '#components/Common/OverlayElement.vue';
import PropsBlockProp from '../PropsBlock/PropsBlockProp.vue';
import MenuButton from '#components/Common/MenuButton.vue';
import ImcGrid from '#components/ImcGrid/ImcGrid.vue';
import MenuList from '#components/Common/MenuList.vue';
import type { MenuListItem } from '#logic/types/MenuList';
import { logicalTreeContains } from '#components/utils/logical-tree';
import {
  getBetweenIndexWithTimestamp,
  getNextIndexWithTimestamp,
  getPreviousIndexWithTimestamp,
} from '#components/Asset/Editor/blockUtils';
import type { AssetChanger } from '#logic/types/AssetChanger';
import ValueTableBlockPrint from './ValueTableBlockPrint.vue';
import type {
  ImcGridChangeCell,
  ImcGridSelectedRange,
} from '#components/ImcGrid/ImcGrid';
import { generateNextUniqueNameNumber } from '#logic/utils/stringUtils';
import ValueTableColumnChangeSettings from './ValueTableColumnChangeSettings.vue';
import RightPanel from '#components/Common/RightPanel.vue';
import {
  type SetClickOutsideCancel,
  setImsClickOutside,
} from '#components/utils/ui';
import DialogManager from '#logic/managers/DialogManager';
import AssetServiceNameDialog from '#components/Asset/AssetServiceNameDialog.vue';

export default defineComponent({
  name: 'ValueTableBlock',
  components: {
    PropsBlockProp,
    OverlayElement,
    MenuButton,
    MenuList,
    ValueTableBlockPrint,
    ImcGrid,
    ValueTableColumnChangeSettings,
    RightPanel,
  },
  provide() {
    return {
      structPropEditorStructIds: [],
    };
  },
  props: {
    assetBlockEditor: {
      type: Object as PropType<AssetBlockEditorVM>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    rights: {
      type: Number as PropType<AssetRights>,
      required: true,
    },
    resolvedBlock: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    displayMode: {
      type: String as PropType<AssetDisplayMode>,
      default: () => 'normal',
    },
  },
  emits: ['save', 'discard'],
  data() {
    return {
      clickOutside: null as SetClickOutsideCancel | null,
      hoveringCell: null as {
        element: HTMLElement;
        rowId: string | null;
        createAfterId: string | null;
        colName: string;
      } | null,
      shownDropdownMenuColumnIdx: null as number | null,
      changingSettingsColumnName: null as null | string,
    };
  },
  computed: {
    rowMenuList() {
      return [
        {
          title: this.$t('assetEditor.blockMenu.delete'),
          icon: 'delete',
          danger: true,
          action: () => {
            const row_index = this.hoveringCellRowIndex;
            if (row_index >= 0) {
              this.deleteRow(this.tableData.rows[row_index]);
            }
          },
        },
      ];
    },
    tableData(): ValueTableBlockData {
      return extractValueTableBlockData(this.resolvedBlock);
    },
    canEditStructure() {
      return this.rights === AssetRights.FULL_ACCESS;
    },
    editMode() {
      return this.assetBlockEditor.isBlockEditing(this.resolvedBlock.id);
    },
    hoveringCellRowIndex() {
      if (!this.hoveringCell) return -1;
      const row_id = this.hoveringCell.rowId;
      return row_id
        ? this.tableData.rows.findIndex((r) => r.id === row_id)
        : -1;
    },
    primaryColIndex() {
      return this.tableData.columns.findIndex(
        (c) => c.name === this.tableData.primary,
      );
    },
    changingSettingsColumn() {
      if (!this.changingSettingsColumnName) return null;
      return (
        this.tableData.columns.find(
          (c) => c.name === this.changingSettingsColumnName,
        ) ?? null
      );
    },
  },
  watch: {
    editMode() {
      this.changingSettingsColumnName = null;
    },
  },
  unmounted() {
    this.resetGlobalClickOutside(false);
  },
  methods: {
    getColumnMenuList(column: ValueTableBlockColumn) {
      return [
        {
          title: this.$t('assetEditor.changeSettings'),
          action: () => this.changeSettingsColumn(column.name),
          icon: 'settings',
        },
        {
          title: this.$t('assetEditor.blockMenu.setServiceName'),
          action: () => this.askChangeServiceNameColumn(column),
          icon: 'serviceName',
        },
        {
          title: this.$t('assetEditor.blockMenu.delete'),
          icon: 'delete',
          danger: true,
          action: () => this.deleteColumn(column),
        },
      ].filter((x) => x) as MenuListItem[];
    },
    save() {
      this.$emit('save');
      this.assetBlockEditor.exitEditMode();
      this.resetGlobalClickOutside(false);
    },
    async enterEditMode(ev?: MouseEvent) {
      if (this.readonly) return;
      if (this.editMode) return;
      if (ev && isElementInteractive(ev.target as HTMLElement)) return;
      this.assetBlockEditor.enterEditMode(this.resolvedBlock.id);
      this.resetGlobalClickOutside(true);
      if (ev) {
        const closest = getClosestNodeBySelector(
          ev.target as Node,
          '.AssetEditorValueTableBlock_Sheet-cell, .AssetEditorValueTableBlockValueStack-item-value',
          this.$el,
        );
        if (closest) {
          await this.$nextTick();
          const imcFocusAtEvent = new CustomEvent('imc-focus-at', {
            bubbles: true,
            detail: {
              clientX: ev.clientX,
              clientY: ev.clientY,
            },
          });
          closest.dispatchEvent(imcFocusAtEvent);
        }
      }
    },
    resetGlobalClickOutside(restart: boolean) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart) {
        this.clickOutside = setImsClickOutside(this.$el, () => {
          this.save();
        });
      }
    },
    onTableMouseEnter(e: MouseEvent) {
      let cell = (e.target as HTMLElement).closest<HTMLElement>(
        '.ScrollableTable-cell[data-part="body"][data-col="0"]',
      );
      if (!cell) {
        cell = (e.target as HTMLElement).closest<HTMLElement>(
          '.ScrollableTable-cell[data-part="header"]',
        );
      }
      if (cell) {
        const col_name = cell.dataset.name ?? null;
        const row_id = cell.dataset.id ?? null;
        if (!col_name) return;
        this.hoveringCell = {
          element: cell,
          colName: col_name,
          rowId: row_id,
          createAfterId: row_id,
        };
      } else {
        const other_cell = (e.target as HTMLElement).closest<HTMLElement>(
          '.ScrollableTable-cell',
        );
        if (other_cell) {
          this.hoveringCell = null;
        }
      }
    },
    onTableMouseLeave(e: MouseEvent) {
      const keep = e.relatedTarget
        ? logicalTreeContains(this.$el, e.relatedTarget as HTMLElement)
        : false;
      if (!keep) {
        this.hoveringCell = null;
      }
    },
    onAddRowOverlayMouseLeave(e: MouseEvent) {
      const keep = e.relatedTarget
        ? logicalTreeContains(this.$el, e.relatedTarget as HTMLElement)
        : false;
      if (!keep) {
        this.hoveringCell = null;
      }
    },
    onAddColumnOverlayMouseLeave() {
      this.hoveringCell = null;
    },
    addRowButton() {
      const new_row = this.addRow(
        this.tableData.rows,
        this.hoveringCell?.createAfterId ?? null,
      );
      if (this.hoveringCell) {
        this.hoveringCell.createAfterId = new_row.id;
      }
    },
    addRow(
      current_rows: ValueTableBlockRowData[],
      after_row_id?: string | null,
      op_id: number | null = null,
    ): ValueTableBlockRowData {
      if (after_row_id === undefined && current_rows.length > 0) {
        after_row_id = current_rows[0].id;
      }

      const after_index = after_row_id
        ? current_rows.findIndex((row) => row.id === after_row_id)
        : -1;
      let row_before: ValueTableBlockRowData | null = null;
      let row_after: ValueTableBlockRowData | null = null;
      let index;
      if (after_index >= 0) {
        row_before = current_rows[after_index];
      }
      if (after_index < current_rows.length - 1) {
        row_after = current_rows[after_index + 1];
      }

      if (row_before && row_after) {
        index = getBetweenIndexWithTimestamp(row_before.index, row_after.index);
      } else if (row_before) {
        index = getNextIndexWithTimestamp(row_before.index);
      } else if (row_after) {
        index = getPreviousIndexWithTimestamp(row_after.index);
      }

      let new_row_id: string | undefined;
      let new_row_id_val: number | null = null;
      if (
        row_before &&
        /^\d+$/.test(row_before.primaryValue?.toString() ?? '')
      ) {
        let next_id_val = parseInt(row_before.primaryValue?.toString() ?? '');
        while (true) {
          next_id_val++;
          const next_id = '_' + next_id_val.toString();
          if (!this.tableData.usedRowIds.has(next_id)) {
            new_row_id = next_id;
            new_row_id_val = next_id_val;
            break;
          }
        }
      }
      if (!new_row_id) new_row_id = uuidv4();

      const op = op_id ?? this.assetChanger.makeOpId();
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `${new_row_id}\\values\\${this.tableData.primary}`,
        new_row_id_val,
        op,
      );
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `${new_row_id}\\index`,
        index ?? 0,
        op,
      );

      return {
        id: new_row_id,
        primaryValue: new_row_id_val,
        index: index ?? 0,
        asset: null,
        columns: [],
        inherited: false,
      };
    },
    addColumnButton(after_col_name?: string | null) {
      this.addColumn(this.tableData.columns, after_col_name);
    },
    addColumn(
      current_cols: ValueTableBlockColumn[],
      after_col_name?: string | null,
      op_id: number | null = null,
    ): ValueTableBlockColumn {
      if (after_col_name === undefined && current_cols.length > 0) {
        after_col_name = current_cols[0].name;
      }

      const after_index = after_col_name
        ? current_cols.findIndex((col) => col.name === after_col_name)
        : -1;
      let col_before: ValueTableBlockColumn | null = null;
      let col_after: ValueTableBlockColumn | null = null;
      let index;
      if (after_index >= 0) {
        col_before = current_cols[after_index];
      }
      if (after_index < current_cols.length - 1) {
        col_after = current_cols[after_index + 1];
      }

      if (col_before && col_after) {
        index = getBetweenIndexWithTimestamp(col_before.index, col_after.index);
      } else if (col_before) {
        index = getNextIndexWithTimestamp(col_before.index);
      } else if (col_after) {
        index = getPreviousIndexWithTimestamp(col_after.index);
      }

      const new_name = uuidv4();

      const op = op_id ?? this.assetChanger.makeOpId();
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__columns\\${new_name}\\values\\${this.tableData.primary}`,
        '',
        op,
      );
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__columns\\${new_name}\\index`,
        index ?? 0,
        op,
      );
      return {
        index: index ?? 0,
        propKey: new_name,
        propTitle: '',
        type: AssetPropType.TEXT,
        multiple: false,
        params: {},
        differentDefinition: false,
        name: new_name,
        width: 100,
      };
    },
    validateColumnName(new_name: string) {
      if (!new_name) return null;
      const exists = this.tableData.columns.find((c) => c.name === new_name);
      if (exists) {
        return this.$t('assetEditor.tableBlockRowColumnNameAlreadyUsed');
      }
      return null;
    },
    validateColumnTitle(val: string) {
      if (!val) return null;
      const new_name = normalizeAssetPropPart(val);
      return this.validateColumnName(new_name);
    },
    setColumnTitleAndName(
      column: ValueTableBlockColumn,
      new_title?: string,
      new_name?: string,
    ) {
      const old_name = column.name;
      if (new_name === undefined) {
        new_name = new_title ? normalizeAssetPropPart(new_title) : '';
      }
      if (new_name === '') {
        new_name = uuidv4();
      }
      if (this.validateColumnName(new_name) !== null) {
        return;
      }
      const op = this.assetChanger.makeOpId();
      if (new_name !== old_name) {
        this.assetChanger.renameBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__columns\\${old_name}`,
          `__columns\\${new_name}`,
          op,
        );
        for (const row of this.tableData.rows) {
          this.assetChanger.renameBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            `${row.id}\\values\\${old_name}`,
            `${row.id}\\values\\${new_name}`,
            op,
          );
        }
        if (this.tableData.primary === old_name) {
          this.assetChanger.setBlockPropKey(
            this.resolvedBlock.assetId,
            makeBlockRef(this.resolvedBlock),
            null,
            `__primary`,
            new_name,
            op,
          );
        }
        if (this.hoveringCell?.colName === old_name) {
          this.hoveringCell.colName = new_name;
        }
        if (this.changingSettingsColumnName === old_name) {
          this.changingSettingsColumnName = new_name;
        }
      }
      if (new_title !== undefined) {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__columns\\${new_name}\\title`,
          new_title,
          op,
        );
      }
    },
    async askChangeServiceNameColumn(column: ValueTableBlockColumn) {
      const new_name_raw = await this.$getAppManager()
        .get(DialogManager)
        .show(
          AssetServiceNameDialog,
          {
            header: this.$t('assetEditor.blockMenu.inputServiceName'),
            yesCaption: this.$t('common.dialogs.rename'),
            value: column.name,
            validate: (val: string) => {
              const new_name = normalizeAssetPropPart(val);
              if (new_name !== column.name) {
                const err = this.validateColumnName(new_name);
                if (err) {
                  throw new Error(err);
                }
              }
              return val;
            },
          },
          this,
        );
      if (new_name_raw === undefined || new_name_raw === null) return;

      const new_name = normalizeAssetPropPart(
        new_name_raw ? new_name_raw : column.propTitle,
      );
      this.setColumnTitleAndName(column, undefined, new_name);
    },
    deleteColumn(column: ValueTableBlockColumn) {
      const op = this.assetChanger.makeOpId();
      this.assetChanger.deleteBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__columns\\${column.name}`,
        op,
      );
      for (const row of this.tableData.rows) {
        this.assetChanger.deleteBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `${row.id}\\values\\${column.name}`,
          op,
        );
      }
      if (this.tableData.primary === column.name) {
        this.assetChanger.setBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          `__primary`,
          null,
          op,
        );
      }
    },
    deleteRow(row: ValueTableBlockRowData) {
      this.assetChanger.deleteBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `${row.id}`,
      );
    },
    onColumnResize(ev: { name: string; width: number }) {
      this.assetChanger.setBlockPropKey(
        this.resolvedBlock.assetId,
        makeBlockRef(this.resolvedBlock),
        null,
        `__columns\\${ev.name}\\width`,
        ev.width,
      );
    },
    changeCells(changes: ImcGridChangeCell[]) {
      const op = this.assetChanger.makeOpId();
      const renamed_row_primaries: [string, AssetPropValue][] = [];
      let last_row_id =
        this.tableData.rows.length > 0
          ? this.tableData.rows[this.tableData.rows.length - 1].id
          : null;
      let last_col_name =
        this.tableData.columns.length > 0
          ? this.tableData.columns[this.tableData.columns.length - 1].name
          : null;
      let current_rows = this.tableData.rows;
      let current_cols = this.tableData.columns;
      const created_row_ids = new Map<number, string>();
      const created_column_names = new Map<number, string>();
      for (const change of changes) {
        let row_id: string;
        let actual_change = change;

        if (!change.field) {
          let created_col_name = created_column_names.get(change.colIndex);
          if (!created_col_name) {
            const col = this.addColumn(current_cols, last_col_name, op);
            current_cols = [...current_cols, col];
            last_col_name = col.name;
            created_col_name = col.name;
            created_column_names.set(change.colIndex, col.name);
          }
          actual_change = {
            ...actual_change,
            changes: actual_change.changes.map((ch) => {
              return assignSubObjectToAssetProps(
                {},
                ch,
                change.row
                  ? `${change.row.id}\\values\\${created_col_name}`
                  : created_col_name,
              );
            }),
          };
        }

        if (change.row) {
          row_id = change.row.id;
        } else {
          const created_row_id = created_row_ids.get(change.rowIndex);
          if (created_row_id) {
            row_id = created_row_id;
          } else {
            const row = this.addRow(current_rows, last_row_id, op);
            current_rows = [...current_rows, row];
            row_id = row.id;
            last_row_id = row_id;
            created_row_ids.set(change.rowIndex, row_id);
          }
          actual_change = {
            ...actual_change,
            changes: actual_change.changes.map((ch) => {
              return assignSubObjectToAssetProps({}, ch, `${row_id}\\values`);
            }),
          };
        }

        if (actual_change.colIndex === this.primaryColIndex) {
          let new_primary: AssetPropValue | undefined = undefined;
          for (const ch of actual_change.changes) {
            const primary_key = `${row_id}\\values\\${this.tableData.primary}`;
            if (ch.hasOwnProperty(primary_key)) {
              new_primary = ch[primary_key];
            }
          }
          if (new_primary !== undefined) {
            renamed_row_primaries.push([row_id, new_primary]);
          }
        }
        this.assetChanger.registerBlockPropsChanges(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          actual_change.changes,
          op,
        );
      }
      const used_primaries = new Set([...current_rows.map((row) => row.id)]);
      for (const renamed_row_primary of renamed_row_primaries) {
        let new_primary_id = renamed_row_primary[1]
          ? normalizeAssetPropPart(
              castAssetPropValueToString(renamed_row_primary[1]),
            )
          : uuidv4();
        if (new_primary_id === renamed_row_primary[0]) {
          continue;
        }
        if (used_primaries.has(new_primary_id)) {
          new_primary_id = generateNextUniqueNameNumber(
            new_primary_id,
            (str) => !used_primaries.has(str),
            '_',
          );
        }

        this.assetChanger.renameBlockPropKey(
          this.resolvedBlock.assetId,
          makeBlockRef(this.resolvedBlock),
          null,
          renamed_row_primary[0],
          new_primary_id,
          op,
        );

        if (this.hoveringCell?.rowId === renamed_row_primary[0]) {
          this.hoveringCell.rowId = new_primary_id;
          this.hoveringCell.createAfterId = new_primary_id;
        }
        used_primaries.delete(renamed_row_primary[0]);
        used_primaries.add(new_primary_id);
      }
    },
    changeSettingsColumn(column_name: string) {
      this.changingSettingsColumnName = column_name;
    },
    changeSettingsColumnIfOpened(column_name: string) {
      if (this.changingSettingsColumnName) {
        this.changingSettingsColumnName = column_name;
      }
    },
    onSelectionUpdated(selection: ImcGridSelectedRange[]) {
      if (!this.changingSettingsColumnName) return;
      if (selection.length === 0) return;
      const col_index = selection[0].colFrom;
      const column = this.tableData.columns[col_index];
      if (!column) return;
      this.changeSettingsColumnIfOpened(column.name);
    },

    switchSettingsColumn(shift: number) {
      const index = this.tableData.columns.findIndex(
        (col) => col.name === this.changingSettingsColumnName,
      );
      if (this.tableData.columns.length > 0 && index > -1) {
        if (index + shift > this.tableData.columns.length - 1) {
          this.changingSettingsColumnName = this.tableData.columns[0].name;
        } else if (index + shift < 0) {
          this.changingSettingsColumnName =
            this.tableData.columns[this.tableData.columns.length - 1].name;
        } else {
          this.changingSettingsColumnName =
            this.tableData.columns[index + shift].name;
        }
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetEditorValueTableBlock-table {
  --table-border: #666666;
  border-top: 1px solid var(--table-border);
  border-left: 1px solid var(--table-border);
}

.AssetEditorValueTableBlock-header,
:global(.AssetEditorValueTableBlockRow) {
  display: flex;
}

:global(.AssetEditorValueTableBlock-addRow),
:global(.AssetEditorValueTableBlock-addColumn) {
  color: #cccccc;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  justify-content: flex-end;

  &:hover {
    color: var(--text-intense);
  }
}

:global(.AssetEditorValueTableBlock-addRow) {
  flex-direction: column;
}
.AssetEditorValueTableBlock-header-cell {
  font-weight: 500;
}
.AssetEditorValueTableBlock-header-cell-menu {
  display: none;

  &.state-active {
    display: block;
  }
}

.AssetEditorValueTableBlock-header-cell:hover {
  .AssetEditorValueTableBlock-header-cell-menu {
    display: block;
  }
}

.AssetEditorValueTableBlock-changeSettingsColumnProp {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background: var(--local-box-color);
  z-index: 200;
  box-shadow: 0px -10px 10px rgba(0, 0, 0, 0.2);
  padding: 20px 20px 20px;
  --local-bg-color: var(--local-box-color);
}
</style>
