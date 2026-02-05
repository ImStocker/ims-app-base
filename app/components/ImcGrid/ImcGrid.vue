<template>
  <div
    v-logical-focus-in="focusIn"
    class="ImcGrid"
    :class="{
      'state-focus-inside': focusInside,
    }"
    @keydown="onKeyDown"
  >
    <textarea
      ref="hiddenText"
      class="ImcGrid-hiddenText"
      @beforeinput="onHiddenTextBeforeInput($event as InputEvent)"
      @copy="onHiddenTextCopy"
      @paste="onHiddenTextPaste"
      @keydown="onHiddenTextKeyDown"
    ></textarea>
    <scrollable-table
      class="ImcGrid-table"
      :columns="columns"
      :rows="rows"
      row-id-key="id"
      :get-body-cell-class="getBodyCellClassInner"
      :allow-resize-columns="allowResizeColumns"
      :workspace-id="workspaceId"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @resize-column="$emit('resizeColumn', $event)"
    >
      <template
        v-for="column of columns"
        :key="column.name"
        #[`header-${column.name}`]
      >
        <slot :name="`header-${column.name}`">{{ column.name }}</slot>
      </template>
      <template
        v-for="(column, column_index) of columns"
        #[`body-${column.name}`]="{ row, rowIndex }"
        :key="column.name"
      >
        <props-block-value-stack
          :ref="(el) => setCellRef(rowIndex, column_index, el as any)"
          class="ImcGrid-cell-inner"
          :class="getCellClass(rowIndex, column_index)"
          :form-state="
            isCellSelected(rowIndex, column_index)
              ? getPreviewCellFormState(row.values[column_index])
              : row.values[column_index].formState
          "
          :field="row.values[column_index].field"
          :edit-mode="
            !readonly &&
            !row.values[column_index].field.readonly &&
            !!focusedCell &&
            focusedCell.row === rowIndex &&
            focusedCell.col === column_index &&
            editMode
          "
          @input-props="onInputCell(rowIndex, column_index, $event)"
          @change-props="onInputCell(rowIndex, column_index, $event, true)"
        ></props-block-value-stack>
      </template>
    </scrollable-table>
    <imc-editor
      ref="hiddenImcEditor"
      class="ImcGrid-hiddenImcEditor"
    ></imc-editor>
  </div>
</template>

<script lang="ts">
import { defineComponent, shallowRef, type PropType } from 'vue';
import {
  convertPastedToSelectionContent,
  convertSelectionDataToHTMLText,
  convertSelectionDataToPlainText,
  extractCellValue,
  getRangeBetweenCoords,
  prepareValueForField,
  type ImcGridChangeCell,
  type ImcGridColumn,
  type ImcGridCoord,
  type ImcGridRow,
  type ImcGridRowColumn,
  type ImcGridSelectedRange,
} from './ImcGrid';
import ScrollableTable from '../ScrollableTable/ScrollableTable.vue';
import PropsBlockValueStack from '~ims-plugin-base/blocks/PropsBlock/PropsBlockValueStack.vue';
import {
  applyPropsChange,
  AssetPropType,
  assignPlainValueToAssetProps,
  assignSubObjectToAssetProps,
  extractAssetPropsSubObject,
  getAssetPropType,
  type AssetProps,
  type AssetPropsPlainObjectValue,
  type AssetPropValue,
  type AssetPropValueType,
} from '../../logic/types/Props.js';
import UiManager, {
  type UiFocusLockHandler,
} from '../../logic/managers/UiManager.js';
import { useImcHTMLRenderer } from '../ImcText/useImcHTMLRenderer';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { ImcEditorQuillController } from '../ImcText/ImcEditorQuillController';
import ImcEditor from '../ImcText/ImcEditor.vue';
import { makeDeletePropKey } from '../../logic/types/makePropsChange';
import type {
  PropsFormFieldDef,
  PropsFormState,
} from '../../logic/types/PropsForm';
import EditorManager from '../../logic/managers/EditorManager';
import {
  type SetClickOutsideCancel,
  setImsClickOutside,
} from '../utils/ui';
import { makeFormStateFromProps } from '../../logic/utils/assets';
import { logicalTreeContains } from '../utils/logical-tree';
import { isElementInteractive } from '../utils/DomElementUtils';

function getClickedCellCoord(e: MouseEvent): ImcGridCoord | null {
  const target = e.target as HTMLElement;
  const cell = target.closest<HTMLElement>('.ImcGrid-cell');
  if (!cell) return null;
  const row = parseInt(cell.dataset.row ?? '0');
  const col = parseInt(cell.dataset.col ?? '0');
  return {
    row,
    col,
  };
}

type MouseClickContext = {
  range: ImcGridSelectedRange;
  start: ImcGridCoord;
  destroy: () => void;
};

export type HandleKeyEvent = {
  key: string;
  selectedRanges: ImcGridSelectedRange[];
  focusedCell: ImcGridCoord | null;
  handled: boolean;
};

export default defineComponent({
  name: 'ImcGrid',
  components: {
    ScrollableTable,
    PropsBlockValueStack,
    ImcEditor,
  },
  props: {
    columns: { type: Array<ImcGridColumn>, required: true },
    rows: { type: Array<ImcGridRow>, required: true },
    allowResizeColumns: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    workspaceId: { type: String, default: null },
    selectedRanges: {
      type: Array<ImcGridSelectedRange>,
      default: () => [],
    },
    getBodyCellClass: {
      type: [Function, null] as PropType<
        (
          row: ImcGridRow,
          row_index: number,
          col_index: number,
        ) => string | string[] | Record<string, boolean> | null
      >,
      default: null,
    },
  },
  emits: [
    'resizeColumn',
    'changeCells',
    'blur',
    'focus',
    'update:selectedRanges',
    'handleKey',
  ],
  data() {
    return {
      focusedCell: null as null | ImcGridCoord,
      lastSelectionCorner: null as null | ImcGridCoord,
      previewValue: null as null | AssetProps,
      previewChanges: [] as AssetProps[],
      innerSelectedRanges: [...this.selectedRanges] as ImcGridSelectedRange[],
      mouseClickContext: null as MouseClickContext | null,
      focusInside: false,
      editMode: false,
      cellRefs: shallowRef(
        new Map<string, InstanceType<typeof PropsBlockValueStack>>(),
      ),
      focusLock: shallowRef(null as UiFocusLockHandler | null),
      clickOutside: null as SetClickOutsideCancel | null,
    };
  },
  computed: {
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
    selectedCellsCount() {
      let count = 0;
      for (const selected_range of this.innerSelectedRanges) {
        count +=
          (selected_range.rowTo - selected_range.rowFrom) *
          (selected_range.colTo - selected_range.colFrom);
      }
      return count;
    },
  },
  watch: {
    selectedRanges() {
      if (this.innerSelectedRanges !== this.selectedRanges) {
        this.innerSelectedRanges = this.selectedRanges;
      }
    },
    innerSelectedRanges() {
      if (this.innerSelectedRanges !== this.selectedRanges) {
        this.$emit('update:selectedRanges', this.innerSelectedRanges);
      }
    },
  },
  unmounted() {
    if (this.mouseClickContext) {
      this.mouseClickContext.destroy();
      this.mouseClickContext = null;
    }
    this.resetGlobalClickOutside(false);
  },
  methods: {
    flushPreviewValue() {
      if (!this.previewValue) {
        return;
      }
      const changes: ImcGridChangeCell[] = [];
      for (const selection of this.innerSelectedRanges) {
        for (
          let rowIndex = selection.rowFrom;
          rowIndex < selection.rowTo;
          rowIndex++
        ) {
          const row = this.rows[rowIndex];
          if (!row) continue;
          for (
            let colIndex = selection.colFrom;
            colIndex < selection.colTo;
            colIndex++
          ) {
            const column = row.values[colIndex];
            if (!column) continue;

            const prefixed_changes = this.previewChanges.map((p) =>
              assignSubObjectToAssetProps({}, p, column.field.propKey),
            );
            changes.push({
              row,
              field: column.field,
              changes: prefixed_changes,
              colIndex,
              rowIndex,
            });
          }
        }
      }
      if (changes.length > 0) {
        this.$emit('changeCells', changes);
      }
      this.previewValue = null;
      this.previewChanges = [];
    },
    changeSelection(innerSelectedRanges: ImcGridSelectedRange[]) {
      this.flushPreviewValue();
      this.innerSelectedRanges = innerSelectedRanges;
    },
    changeCell(change: ImcGridChangeCell) {
      this.$emit('changeCells', [change]);
    },
    isCellSelected(rowIndex: number, colIndex: number) {
      return this.innerSelectedRanges.some((range) => {
        return (
          rowIndex >= range.rowFrom &&
          rowIndex < range.rowTo &&
          colIndex >= range.colFrom &&
          colIndex < range.colTo
        );
      });
    },
    getCellClass(rowIndex: number, colIndex: number) {
      let is_selected = false;
      let sel_left = true;
      let sel_top = true;
      let sel_bottom = true;
      let sel_right = true;
      for (const range of this.innerSelectedRanges) {
        if (
          rowIndex >= range.rowFrom &&
          rowIndex < range.rowTo &&
          colIndex >= range.colFrom &&
          colIndex < range.colTo
        ) {
          is_selected = true;
          sel_left = sel_left && colIndex === range.colFrom;
          sel_top = sel_top && rowIndex === range.rowFrom;
          sel_bottom = sel_bottom && rowIndex === range.rowTo - 1;
          sel_right = sel_right && colIndex === range.colTo - 1;
        }
      }

      let value_is_number = false;
      const row = this.rows[rowIndex];
      if (row) {
        const column = row.values[colIndex];
        if (column) {
          value_is_number =
            typeof column.formState.combined[column.field.propKey] === 'number';
        }
      }

      return {
        'state-focused':
          this.focusedCell &&
          this.focusedCell.row === rowIndex &&
          this.focusedCell.col === colIndex,
        'state-selected': is_selected,
        'state-sel-left': is_selected && sel_left,
        'state-sel-top': is_selected && sel_top,
        'state-sel-right': is_selected && sel_right,
        'state-sel-bottom': is_selected && sel_bottom,
        'state-value-number': value_is_number,
      };
    },
    onMouseDown(md_ev: MouseEvent) {
      const mousedown_coord = getClickedCellCoord(md_ev);
      if (!mousedown_coord) return;
      if (this.mouseClickContext) return;

      let clicked_on_already_focused = false;
      const onmouseup = (mu_ev) => {
        if (!this.mouseClickContext) {
          return;
        }

        const mouseup_coord = getClickedCellCoord(mu_ev);
        if (
          mouseup_coord &&
          clicked_on_already_focused &&
          this.focusedCell &&
          this.focusedCell.row === mouseup_coord.row &&
          this.focusedCell.col === mouseup_coord.col
        ) {
          this.editMode = true;
          if (
            !md_ev.target ||
            !isElementInteractive(md_ev.target as HTMLElement)
          ) {
            setTimeout(() => {
              const comp = this.getCellRef(
                mouseup_coord.row,
                mouseup_coord.col,
              );
              if (comp && comp.$el) {
                if (
                  !document.activeElement ||
                  !logicalTreeContains(comp.$el, document.activeElement)
                ) {
                  comp.focus();
                }
              }
            }, 1);
          }
        } else {
          this.lastSelectionCorner = mouseup_coord;
          setTimeout(() => {
            if (this.$refs['hiddenText']) {
              (this.$refs['hiddenText'] as HTMLTextAreaElement).focus();
            }
          }, 1);
        }

        this.mouseClickContext.destroy();
        this.mouseClickContext = null;
      };
      window.addEventListener('mouseup', onmouseup, false);
      this.mouseClickContext = {
        range: {
          rowFrom: mousedown_coord.row,
          rowTo: mousedown_coord.row + 1,
          colFrom: mousedown_coord.col,
          colTo: mousedown_coord.col + 1,
        },
        start: mousedown_coord,
        destroy: () => {
          window.removeEventListener('mouseup', onmouseup, false);
        },
      };
      if (this.focusedCell && md_ev.shiftKey) {
        this.mouseClickContext.start = this.focusedCell;
        this.mouseClickContext.range = getRangeBetweenCoords(
          this.mouseClickContext.start,
          mousedown_coord,
        );
        this.lastSelectionCorner = mousedown_coord;
        this.changeSelection([this.mouseClickContext.range]);
      } else {
        if (
          this.focusedCell &&
          this.focusedCell.row === mousedown_coord.row &&
          this.focusedCell.col === mousedown_coord.col
        ) {
          clicked_on_already_focused = true;
        } else {
          this.changeSelection([this.mouseClickContext.range]);
          this.editMode = false;
          this.focusedCell = mousedown_coord;
          this.lastSelectionCorner = mousedown_coord;
        }
      }
      setTimeout(() => {
        if (
          this.$refs['hiddenText'] &&
          (!clicked_on_already_focused || !this.isFocused())
        ) {
          (this.$refs['hiddenText'] as HTMLTextAreaElement).focus();
        }
      }, 1);
    },
    onMouseMove(e: MouseEvent) {
      const coord = getClickedCellCoord(e);
      if (!coord) return;
      if (!this.mouseClickContext) return;

      const is_on_start =
        coord.row === this.mouseClickContext.start.row &&
        coord.col === this.mouseClickContext.start.col;

      if (
        !is_on_start &&
        this.innerSelectedRanges.length > 0 &&
        this.innerSelectedRanges[this.innerSelectedRanges.length - 1] !==
          this.mouseClickContext.range
      ) {
        this.changeSelection([
          ...this.innerSelectedRanges.slice(
            0,
            this.innerSelectedRanges.length - 1,
          ),
          this.mouseClickContext.range,
        ]);
      }

      Object.assign(
        this.mouseClickContext.range,
        getRangeBetweenCoords(this.mouseClickContext.start, coord),
      );
      this.lastSelectionCorner = coord;
    },
    _changeCoord(coord: ImcGridCoord, dx: number, dy: number, wrap = false) {
      if (dx === 0 && dy === 0) return coord;
      const new_coord = { ...coord };
      new_coord.row = Math.max(
        Math.min(new_coord.row + dy, this.rows.length - 1),
        0,
      );
      new_coord.col = new_coord.col + dx;
      if (new_coord.col < 0) {
        if (wrap) {
          new_coord.col = this.columns.length - 1;
          if (new_coord.row > 0) {
            new_coord.row--;
          }
        } else new_coord.col = 0;
      } else if (new_coord.col >= this.columns.length) {
        if (wrap) {
          new_coord.col = 0;
          if (new_coord.row < this.rows.length - 1) {
            new_coord.row++;
          }
        } else new_coord.col = this.columns.length - 1;
      }
      return new_coord;
    },
    onMoveSelection(
      dx: number,
      dy: number,
      wrap: boolean = false,
      extend = false,
    ) {
      if (!this.focusedCell) {
        this.focusedCell = {
          col: 0,
          row: 0,
        };
        this.lastSelectionCorner = this.focusedCell;
      } else if (!extend) {
        this.focusedCell = this._changeCoord(this.focusedCell, dx, dy, wrap);
        this.lastSelectionCorner = this.focusedCell;
      }

      if (!extend || this.innerSelectedRanges.length === 0) {
        this.changeSelection([
          {
            rowFrom: this.focusedCell.row,
            rowTo: this.focusedCell.row + 1,
            colFrom: this.focusedCell.col,
            colTo: this.focusedCell.col + 1,
          },
        ]);
      } else {
        this.lastSelectionCorner = this._changeCoord(
          this.lastSelectionCorner
            ? this.lastSelectionCorner
            : this.focusedCell,
          dx,
          dy,
          wrap,
        );
        this.changeSelection([
          getRangeBetweenCoords(this.focusedCell, this.lastSelectionCorner),
        ]);
      }
      this.editMode = false;
      if (!this.$el) return;
      const cell_el = this.$el.querySelector(
        `.ImcGrid-cell[data-col="${this.focusedCell.col}"][data-row="${this.focusedCell.row}"]`,
      ) as HTMLElement | null;
      if (!cell_el) return;
      cell_el.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    },
    _askHandleKey(key: string): boolean {
      const handle_event: HandleKeyEvent = {
        key: key,
        focusedCell: this.focusedCell,
        selectedRanges: this.innerSelectedRanges,
        handled: false,
      };
      this.$emit('handleKey', handle_event);
      return handle_event.handled;
    },
    onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Tab': {
          if (this._askHandleKey(e.key)) {
            e.preventDefault();
            return;
          }
          if (this.focusedCell) {
            const is_focused_first =
              this.focusedCell.row === 0 && this.focusedCell.col === 0;
            const is_focused_last =
              this.focusedCell.row === this.rows.length - 1 &&
              this.focusedCell.col === this.columns.length - 1;
            if (!is_focused_first && !is_focused_last) {
              e.preventDefault();
              this.onMoveSelection(e.shiftKey ? -1 : 1, 0, true);
            }
          }
          break;
        }
      }
    },
    onHiddenTextKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          if (!this.editMode) {
            e.preventDefault();
            if (this._askHandleKey(e.key)) {
              return;
            }
            this.onMoveSelection(-1, 0, false, e.shiftKey);
          }
          break;
        case 'ArrowRight':
          if (!this.editMode) {
            e.preventDefault();
            if (this._askHandleKey(e.key)) {
              return;
            }
            this.onMoveSelection(1, 0, false, e.shiftKey);
          }
          break;
        case 'ArrowUp':
          if (!this.editMode) {
            e.preventDefault();
            if (this._askHandleKey(e.key)) {
              return;
            }
            this.onMoveSelection(0, -1, false, e.shiftKey);
          }
          break;
        case 'ArrowDown':
          if (!this.editMode) {
            e.preventDefault();
            if (this._askHandleKey(e.key)) {
              return;
            }
            this.onMoveSelection(0, 1, false, e.shiftKey);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (!this.editMode) {
            e.preventDefault();
            if (this._askHandleKey(e.key)) {
              return;
            }
            const changes: ImcGridChangeCell[] = [];
            this.fillSelectionRange(changes, this.innerSelectedRanges, null);
            if (changes.length > 0) {
              this.$emit('changeCells', changes);
            }
          }
          break;
      }
    },
    isFocused() {
      return !!this.focusLock;
    },
    async focusOut() {
      const lock = this.focusLock;
      this.focusLock = null;
      await new Promise((res) => setTimeout(res, 1));
      if (!this.focusLock) {
        if (lock) await lock.unlock();
        this.focusInside = false;
        this.focusedCell = null;
        this.innerSelectedRanges = [];
        this.$emit('blur');
      }
    },
    resetGlobalClickOutside(restart: boolean) {
      if (this.clickOutside) {
        this.clickOutside();
        this.clickOutside = null;
      }
      if (restart) {
        this.clickOutside = setImsClickOutside(
          () => [this.$el],
          () => {
            this.focusOut();
          },
        );
      }
    },
    focusIn() {
      if (!this.focusLock) {
        this.focusLock = this.$getAppManager()
          .get(UiManager)
          .focusLock(async () => {
            if (this.previewValue) {
              this.flushPreviewValue();
              this.editMode = false;
              await new Promise((res) => setTimeout(res, 1));
            }
          });
        this.focusInside = true;
        this.$emit('focus');
        this.resetGlobalClickOutside(true);
      }
    },
    getCellRef(
      row: number,
      col: number,
    ): InstanceType<typeof PropsBlockValueStack> | null {
      return this.cellRefs.get(`${row}:${col}`) ?? null;
    },
    setCellRef(
      row: number,
      col: number,
      component: InstanceType<typeof PropsBlockValueStack> | null,
    ) {
      if (component) {
        this.cellRefs.set(`${row}:${col}`, component);
      } else {
        this.cellRefs.delete(`${row}:${col}`);
      }
    },
    async onHiddenTextBeforeInput(ev: InputEvent) {
      ev.preventDefault();
      if (this.readonly) {
        return;
      }
      const coord = this.focusedCell;
      if (!coord) return;
      this.editMode = true;

      const row = this.rows[coord.row];
      if (!row) return;

      const column = row.values[coord.col];
      if (!column) return;
      if (column.field.readonly) return;

      const changes = this._prepareValueToChanges(column.field, ev.data);
      await this.$nextTick();
      const comp = this.getCellRef(coord.row, coord.col);
      if (!comp) return;
      const active = await comp.awaitFirstComponentReady();
      if (!active) return;
      this.onInputCell(coord.row, coord.col, changes);
      await this.$nextTick();
      comp.focusEnd();
    },
    getPreviewCellFormState(column: ImcGridRowColumn): PropsFormState {
      if (!this.previewValue) {
        return column.formState;
      }
      const new_state = applyPropsChange(column.formState.combined, null, [
        {
          [`~${column.field.propKey}`]: null,
          ...assignSubObjectToAssetProps(
            {},
            this.previewValue,
            column.field.propKey,
          ),
        },
      ]).props;
      return makeFormStateFromProps(new_state);
    },
    onInputCell(
      rowIndex: number,
      colIndex: number,
      changes: AssetProps[],
      flush = false,
    ) {
      const row = this.rows[rowIndex];
      if (!row) return;
      const column = row.values[colIndex];
      if (!column) return;
      if (column.field.readonly) return;

      if (this.selectedCellsCount <= 1 && flush) {
        this.previewValue = null;
        this.previewChanges = [];
        this.$emit('changeCells', [
          {
            rowIndex,
            colIndex,
            row,
            field: column.field,
            changes: changes,
          } as ImcGridChangeCell,
        ]);
        return;
      }
      if (!this.previewValue) {
        this.previewValue = extractAssetPropsSubObject(
          column.formState.combined,
          column.field.propKey,
        );
      }

      const extracted_changes = changes.map((change) => {
        return extractAssetPropsSubObject(change, column.field.propKey);
      });
      const res = applyPropsChange(this.previewValue, null, extracted_changes);
      this.previewValue = res.props;

      for (const extracted_change of extracted_changes) {
        const some_delete = [...Object.keys(extracted_change)].some((key) =>
          key.startsWith('~'),
        );
        if (some_delete || this.previewChanges.length === 0) {
          this.previewChanges.push(extracted_change);
        } else {
          Object.assign(
            this.previewChanges[this.previewChanges.length - 1],
            extracted_change,
          );
        }
      }
    },
    getSelectionContent(): AssetPropsPlainObjectValue[][][] {
      const res: AssetPropsPlainObjectValue[][][] = [];
      for (const selection of this.innerSelectedRanges) {
        const range_res: AssetPropsPlainObjectValue[][] = [];
        for (let row = selection.rowFrom; row < selection.rowTo; row++) {
          const row_data = this.rows[row];
          if (!row_data) continue;

          const row_list: AssetPropsPlainObjectValue[] = [];
          for (let col = selection.colFrom; col < selection.colTo; col++) {
            const col_data = row_data.values[col];
            if (!col_data) continue;

            const plain_cell_data = extractCellValue(
              col_data.formState,
              col_data.field,
            );
            row_list.push(plain_cell_data);
          }
          range_res.push(row_list);
        }
        res.push(range_res);
      }
      return res;
    },
    _prepareValueToChanges(
      field: PropsFormFieldDef | null,
      value: AssetPropsPlainObjectValue,
    ): AssetProps[] {
      const field_prop_key = field?.propKey ?? '';
      let field_accepted_types: AssetPropValueType[] | null;
      const field_controller = field
        ? this.$getAppManager().get(EditorManager).getFieldTypesMap()[
            field.type ?? 'text'
          ]
        : null;
      if (field_controller) {
        field_accepted_types = field_controller.dataTypes ?? null;
      } else {
        field_accepted_types = [
          {
            Type: AssetPropType.TEXT,
          },
        ];
      }
      const field_multiple = field?.multiple ?? false;
      const prepared_value =
        value !== null
          ? prepareValueForField(value, field_accepted_types, field_multiple)
          : null;
      const value_type = getAssetPropType(prepared_value as AssetPropValue);
      let set_props: AssetProps | null = null;
      if (prepared_value !== null) {
        if (Array.isArray(prepared_value) || !value_type) {
          set_props = {};
          assignPlainValueToAssetProps(
            set_props,
            prepared_value as AssetPropsPlainObjectValue,
            field_prop_key,
          );
        } else {
          set_props = {
            [field_prop_key]: prepared_value as AssetPropValue,
          };
        }
      } else if (!field) {
        set_props = {
          [field_prop_key]: null,
        };
      }
      const changes: AssetProps[] = [];
      if (field) {
        changes.push(makeDeletePropKey(field_prop_key));
      }
      if (set_props) {
        changes.push(set_props);
      }
      return changes;
    },
    putDataToCell(
      targetChanges: ImcGridChangeCell[],
      row: number,
      col: number,
      value: AssetPropsPlainObjectValue,
    ): boolean {
      const row_obj = row < this.rows.length ? this.rows[row] : null;
      const field =
        col < this.columns.length
          ? row_obj
            ? row_obj.values[col].field
            : this.columns[col]
          : null;

      if (field?.readonly) {
        return false;
      }
      const changes = this._prepareValueToChanges(field, value);

      targetChanges.push({
        row: row_obj,
        rowIndex: row,
        colIndex: col,
        field,
        changes,
      });
      return true;
    },
    fillSelectionRange(
      targetChanges: ImcGridChangeCell[],
      innerSelectedRanges: ImcGridSelectedRange[],
      value: AssetPropsPlainObjectValue,
    ) {
      for (const range of innerSelectedRanges) {
        for (let rowIndex = range.rowFrom; rowIndex < range.rowTo; rowIndex++) {
          for (
            let colIndex = range.colFrom;
            colIndex < range.colTo;
            colIndex++
          ) {
            this.putDataToCell(targetChanges, rowIndex, colIndex, value);
          }
        }
      }
    },
    putDataToRow(
      targetChanges: ImcGridChangeCell[],
      row: number,
      colFrom: number,
      colTo: number,
      values: AssetPropsPlainObjectValue[],
    ) {
      for (let c = 0; c < colTo - colFrom; c++) {
        const col = colFrom + c;
        const value_col = c % values.length;
        this.putDataToCell(targetChanges, row, col, values[value_col]);
      }
    },
    putDataToSelectionRanges(
      targetChanges: ImcGridChangeCell[],
      innerSelectedRanges: ImcGridSelectedRange[],
      content: AssetPropsPlainObjectValue[][][],
    ) {
      if (innerSelectedRanges.length === 0 || content.length === 0) {
        return;
      }
      const unwrapped_content = content.flat();

      let selected_range_total_rows = 0;
      for (const selected_range of innerSelectedRanges) {
        selected_range_total_rows +=
          selected_range.rowTo - selected_range.rowFrom;
      }

      let current_range_i = 0;
      let current_range_row = innerSelectedRanges[current_range_i].rowFrom;
      for (
        let row = 0;
        row < Math.max(selected_range_total_rows, unwrapped_content.length);
        row++
      ) {
        const content_row = unwrapped_content[row % unwrapped_content.length];
        this.putDataToRow(
          targetChanges,
          current_range_row,
          innerSelectedRanges[current_range_i].colFrom,
          Math.max(
            innerSelectedRanges[current_range_i].colTo,
            innerSelectedRanges[current_range_i].colFrom + content_row.length,
          ),
          content_row,
        );
        current_range_row++;
        if (current_range_row >= innerSelectedRanges[current_range_i].rowTo) {
          if (current_range_i < innerSelectedRanges.length - 1) {
            current_range_i++;
          }
        }
      }
    },
    async onHiddenTextCopy(ev: ClipboardEvent) {
      ev.preventDefault();
      const imcHtmlRenderer = useImcHTMLRenderer();
      const content = this.getSelectionContent();
      const plain = convertSelectionDataToPlainText(content);
      const html = convertSelectionDataToHTMLText(content, (val) => {
        return imcHtmlRenderer(val, {
          project: this.projectInfo ?? undefined,
        });
      });

      const blobPlain = new Blob([plain], { type: 'text/plain' });
      const blobHTML = new Blob([html], { type: 'text/html' });
      const data = [
        new ClipboardItem({
          ['text/plain']: blobPlain,
          ['text/html']: blobHTML,
        }),
      ];
      await this.$getAppManager()
        .get(UiManager)
        .doTask(async () => {
          await navigator.clipboard.write(data);
          this.$getAppManager()
            .get(UiManager)
            .showSuccess(this.$t('common.copied'));
        });
    },
    async onHiddenTextPaste(ev: ClipboardEvent) {
      ev.preventDefault();
      if (this.readonly) {
        return;
      }

      const text = ev.clipboardData?.getData('text/plain') ?? '';
      const html = ev.clipboardData?.getData('text/html') ?? '';
      const quill_controller = this.getQuillController();
      const quill = quill_controller
        ? await quill_controller.awaitQuill()
        : null;
      const content = convertPastedToSelectionContent(quill, html, text);
      const changes: ImcGridChangeCell[] = [];
      this.putDataToSelectionRanges(
        changes,
        this.innerSelectedRanges,
        content.result,
      );
      if (changes.length > 0) {
        this.$emit('changeCells', changes);
      }
    },
    getQuillController(): ImcEditorQuillController | null {
      if (!this.$refs['hiddenImcEditor']) return null;
      return (this.$refs['hiddenImcEditor'] as InstanceType<typeof ImcEditor>)
        .quillController;
    },
    getBodyCellClassInner(
      row: ImcGridRow,
      row_index: number,
      col_index: number,
    ) {
      const cell_cl = this.getBodyCellClass
        ? this.getBodyCellClass(row, row_index, col_index)
        : null;
      const res: { [cl: string]: boolean } = {
        'ImcGrid-cell': true,
      };
      if (cell_cl) {
        if (Array.isArray(cell_cl)) {
          for (const rc of cell_cl) {
            res[rc] = true;
          }
        } else if (typeof cell_cl === 'object') {
          Object.assign(res, cell_cl);
        } else res[cell_cl] = true;
      }
      return res;
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ImcGrid {
  --imc-grid-selection-border-color: var(--color-main-yellow);
  --imc-grid-selection-overlay-color: var(--color-main-yellow);
}
.ImcGrid-table:deep(.ImcGrid-cell) {
  user-select: none;
}
.ImcGrid-hiddenText {
  width: 0;
  height: 0;
  max-width: 0;
  max-height: 0;
  position: fixed;
  left: 0;
  top: 0;
  opacity: 0;
  pointer-events: none;
}

.ImcGrid.state-focus-inside {
  .ImcGrid-cell-inner {
    &.state-sel-left {
      border-left: 2px solid var(--imc-grid-selection-border-color);
      margin-left: -1px;
      padding-left: 0;
    }
    &.state-sel-top {
      border-top: 2px solid var(--imc-grid-selection-border-color);
      margin-top: -1px;
      padding-top: 0;
    }
    &.state-sel-right {
      border-right: 2px solid var(--imc-grid-selection-border-color);
      margin-right: -1px;
      padding-right: 0;
    }
    &.state-sel-bottom {
      border-bottom: 2px solid var(--imc-grid-selection-border-color);
      margin-bottom: -1px;
      padding-bottom: 0;
    }
  }
}

.ImcGrid:not(.ImcGrid.state-focus-inside) .ImcGrid-cell-inner.state-selected,
.ImcGrid-cell-inner.state-selected:not(.state-focused) {
  position: relative;
  z-index: 5;
  &:after {
    content: '';
    display: block;
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    bottom: -1px;
    background: var(--imc-grid-selection-overlay-color);
    opacity: 0.05;
    pointer-events: none;
  }
}
.ImcGrid-cell-inner {
  min-height: 100%;
  min-width: 100%;
  padding: 1px;
  &.state-value-number {
    text-align: right;
  }
}
.ImcGrid-hiddenImcEditor {
  display: none;
}
.ImcGrid-table:deep(.ScrollableTable-body.ref-body),
.ImcGrid-table:deep(.ScrollableTable-header.ref-header),
.ImcGrid-table:deep(.ScrollableTable-footer.ref-footer) {
  margin-right: 1px;
}
</style>
