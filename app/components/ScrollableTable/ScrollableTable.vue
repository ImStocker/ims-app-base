<template>
  <div
    ref="table"
    class="ScrollableTable"
    :class="{
      'type-has-footer': hasFooter,
    }"
    :style="{
      '--ScrollableTable-resizerShift':
        interactResizer && interactResizer.captured
          ? `${interactResizer.shiftX}px`
          : '0px',
      '--ScrollableTable-headerReservedSpace': `${tableRealHeaderReservedSpace}px`,
    }"
    @mousemove.passive="onMouseMove"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
  >
    <div
      v-if="tableRealHeaderReservedSpace > 0"
      class="ScrollableTable-headerReservedSpace"
    ></div>
    <div
      ref="header"
      class="ScrollableTable-header ref-header"
      :style="tableHeaderStyle.value"
      @scroll.passive="onScroll"
      @wheel="onContentMouseWheel"
      @touchmove="onTouchmove"
    >
      <div
        v-for="(col, col_index) of columnsInfo"
        :key="col.column.name"
        class="ScrollableTable-cell"
        data-part="header"
        :data-name="col.column.name"
        :data-col="col_index"
        :data-pin="col.column.pin"
        :style="getHeaderCellStyle(col_index)"
      >
        <slot
          :name="'header-' + col.column.name"
          :column="col"
          :column-index="col_index"
        >
          {{ col.column.name }}
        </slot>
        <div
          v-if="allowResizeColumns && col_index < columns.length - 1"
          class="ScrollableTable-columnResizer"
          :class="{
            'state-interact':
              interactResizer && interactResizer.name === col.column.name,
          }"
        ></div>
      </div>
    </div>
    <div
      ref="body"
      class="ScrollableTable-body ref-body"
      :style="tableBodyStyle"
      @scroll.passive="onScroll"
      @wheel="onContentMouseWheel"
      @touchmove="onTouchmove"
    >
      <template v-for="(row, row_index) of rows" :key="getRowId(row)">
        <div
          v-for="(col, col_index) of columnsInfo"
          :key="col.column.name"
          :data-id="getRowId(row)"
          class="ScrollableTable-cell"
          :style="getBodyCellStyle(row_index, col_index)"
          :class="getResBodyCellClass(row, row_index, col_index)"
          :data-col="col_index"
          :data-row="row_index"
          data-part="body"
          :data-name="col.column.name"
          :data-pin="col.column.pin"
        >
          <slot
            :name="'body-' + col.column.name"
            :column="col"
            :column-index="col_index"
            :row="row"
            :row-index="row_index"
          >
            {{ getRowValue(row, col.column, col_index) }}
          </slot>
          <div
            v-if="allowResizeColumns && col_index < columns.length - 1"
            class="ScrollableTable-columnResizer"
            :class="{
              'state-interact':
                interactResizer && interactResizer.name === col.column.name,
            }"
          ></div>
        </div>
      </template>
    </div>
    <div
      ref="footer"
      class="ScrollableTable-footer ref-footer large-scrollbars"
      :style="tableFooterStyle.value"
      @scroll.passive="onScroll"
      @wheel="onContentMouseWheel"
      @touchmove="onTouchmove"
    >
      <div
        v-for="(col, col_index) of columnsInfo"
        :key="col.column.name"
        class="ScrollableTable-cell"
        :data-col="col_index"
        data-part="footer"
        :data-name="col.column.name"
        :style="getFooterCellStyle(col_index)"
        :data-pin="col.column.pin"
      >
        <slot
          :name="'footer-' + col.column.name"
          :column="col"
          :column-index="col_index"
        ></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  type PropType,
} from 'vue';
import type { ScrollableTableColumn } from './ScrollableTable';
import type { AssetPropValue } from '../../logic/types/Props';
import { useSlots } from 'vue';
import {
  trackElementBounds,
  type TrackElementBoundsHandler,
} from '../../logic/utils/trackElementBounds';

const MIN_COLUMN_WIDTH = 20;
const DEFAULT_COLUMN_WIDTH = 100;

export type ScrollableTableColumnInfo = {
  column: ScrollableTableColumn;
  offsetLeft: number;
  offsetRight: number;
  width: number;
};

const $slots = useSlots();

const $emit = defineEmits<{
  resizeColumn: [{ name: string; width: number }];
}>();

const props = defineProps({
  columns: { type: Array<ScrollableTableColumn>, required: true },
  rows: { type: Array<any>, required: true },
  rowIdKey: {
    type: [String, Function] as PropType<string | ((row: any) => string)>,
    default: 'id',
  },
  getRowValue: {
    type: Function as PropType<
      (row: any, col: ScrollableTableColumn, colIndex: number) => AssetPropValue
    >,
    default: () => (row: any, col: ScrollableTableColumn) => row[col.name],
  },
  getBodyCellClass: {
    type: [Function, null] as PropType<
      (
        row: any,
        row_index: number,
        col_index: number,
      ) => string | string[] | Record<string, boolean> | null
    >,
    default: null,
  },
  workspaceId: { type: String, default: null },
  allowResizeColumns: { type: Boolean, default: false },
});

let _scrollLeft = 0;
let touchScroll = null as null | { clientX: number; time: number };
const highlightedId = ref<null | string>(null);
const interactResizer = ref<null | {
  name: string;
  captured: boolean;
  shiftX: number;
}>(null);

const tableBodyStyle = computed(() => {
  const grid_parts: string[] = [];
  if (fillerColumnIndex.value > 0) {
    grid_parts.push(`repeat(${fillerColumnIndex.value}, auto)`);
  }
  grid_parts.push('1fr');
  if (props.columns.length - 1 - fillerColumnIndex.value > 0) {
    grid_parts.push(
      `repeat(${props.columns.length - 1 - fillerColumnIndex.value}, auto)`,
    );
  }
  return {
    gridTemplateColumns: grid_parts.join(' '),
  };
});

const tableHeaderStyle = computed(() => {
  return tableBodyStyle;
});

const tableFooterStyle = computed(() => {
  return tableBodyStyle;
});

const hasFooter = computed(() => {
  return props.columns.some((col) => $slots['footer-' + col.name]);
});

const columnsInfo = computed<ScrollableTableColumnInfo[]>(() => {
  const res: ScrollableTableColumnInfo[] = [];
  let offset = 0;
  for (const column of props.columns) {
    const width =
      column.width === undefined
        ? DEFAULT_COLUMN_WIDTH
        : Math.max(column.width, MIN_COLUMN_WIDTH);
    res.push({
      column,
      offsetLeft: offset,
      offsetRight: 0,
      width,
    });
    offset += width;
  }
  offset = 0;
  for (let col_ind = res.length - 1; col_ind >= 0; col_ind--) {
    res[col_ind].offsetRight = offset;
    offset += res[col_ind].width;
  }
  return res;
});

const fillerColumnIndex = computed(() => {
  let ind = props.columns.length - 1;
  while (ind > 0 && props.columns[ind].pin === 'right') {
    ind--;
  }
  return ind;
});

const headerRef = useTemplateRef('header');
const bodyRef = useTemplateRef('body');
const footerRef = useTemplateRef('footer');
const tableRef = useTemplateRef('table');

function getHeaderCellStyle(colIndex: number) {
  const res: Record<string, string> = {};

  const col = columnsInfo.value[colIndex];
  if (!col) return res;

  if (colIndex !== fillerColumnIndex.value) {
    res.width = `${col.width}px`;
  } else {
    res.minWidth = `${col.width}px`;
  }

  if (col.column.pin) {
    res['position'] = 'sticky';
    res['zIndex'] = '20';
    if (col.column.pin === 'left') {
      res['left'] = `${col.offsetLeft}px`;
    } else {
      res['right'] = `${col.offsetRight}px`;
    }
  }
  return res;
}
function getFooterCellStyle(colIndex: number) {
  return getHeaderCellStyle(colIndex);
}
function getBodyCellStyle(_rowIndex: number, colIndex: number) {
  return getHeaderCellStyle(colIndex);
}
function getRowId(row: any) {
  return typeof props.rowIdKey === 'function'
    ? props.rowIdKey(row)
    : row[props.rowIdKey];
}
function getResBodyCellClass(row: any, row_index: number, col_index: number) {
  const cell_cl = props.getBodyCellClass
    ? props.getBodyCellClass(row, row_index, col_index)
    : null;
  const res: { [cl: string]: boolean } = {
    'state-row-hightlight': highlightedId.value === row.id,
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
}
function updateScroll() {
  const contents = [
    headerRef.value,
    bodyRef.value,
    footerRef.value,
  ] as (HTMLElement | null)[];
  for (const content of contents) {
    if (!content) continue;
    if (Math.abs(content.scrollLeft - _scrollLeft) >= 0.001) {
      content.scrollLeft = _scrollLeft;
    }
  }
}
function setScrollX(val: number) {
  _scrollLeft = val;
  if (tableRef.value) {
    tableRef.value.style.setProperty(
      '--ScrollableTable-scrollLeft',
      `${_scrollLeft}px`,
    );
  }
  updateScroll();
}

function onTouchmove(e: TouchEvent) {
  if (!e.currentTarget) return;
  if (!tableRef.value) return;
  if (e.changedTouches.length === 0) return;

  const touch = e.changedTouches[0];
  const now = Date.now();

  if (touchScroll && now - touchScroll.time < 200) {
    const dx = touchScroll.clientX - touch.clientX;

    e.preventDefault();
    const new_scroll_x = (e.currentTarget as HTMLElement).scrollLeft + dx;
    setScrollX(new_scroll_x);
  }

  touchScroll = {
    time: now,
    clientX: touch.clientX,
  };
}

function onContentMouseWheel(e: WheelEvent) {
  if (!e.currentTarget) return;
  if (!tableRef.value) return;

  let scroll_delta = e.deltaX;
  if (e.shiftKey) scroll_delta = e.deltaY;
  if (scroll_delta === 0) return;

  e.preventDefault();
  const new_scroll_x =
    (e.currentTarget as HTMLElement).scrollLeft + scroll_delta;
  setScrollX(new_scroll_x);
}
function onScroll(e: Event) {
  if (!e.currentTarget) return;
  if (!tableRef.value) return;

  const new_scroll_x = (e.currentTarget as HTMLElement).scrollLeft;
  setScrollX(new_scroll_x);
}
function onMouseMove(e: MouseEvent) {
  if (!e.target) return;
  if (!tableRef.value) return;

  const resizer = (e.target as HTMLElement).closest<HTMLElement>(
    '.ScrollableTable-columnResizer',
  );
  const cell = (e.target as HTMLElement).closest<HTMLElement>(
    '.ScrollableTable-cell',
  );

  if (cell && cell.dataset.id) {
    highlightedId.value = cell.dataset.id;
  }

  if (interactResizer.value && interactResizer.value.captured) {
    // Do nothing
  } else {
    if (resizer && cell && cell.dataset.part === 'header') {
      interactResizer.value = {
        name: cell.dataset.name ?? '',
        captured: false,
        shiftX: 0,
      };
    } else {
      interactResizer.value = null;
    }
  }
}
function onMouseLeave(_e: MouseEvent) {
  highlightedId.value = null;
  interactResizer.value = null;
}
function onMouseDown(e: MouseEvent) {
  if (interactResizer.value) {
    resizerCapture(true, e.screenX, e.screenY);
  }
}

let _resizerCaptureMove = null as null | ((e: MouseEvent) => void);
let _resizeCaptureMouseUp = null as null | ((e: MouseEvent) => void);
let _resizerCaptureRelease = null as null | (() => void);

function resizerCapture(val: boolean, startX?: number, _startY?: number) {
  if (_resizerCaptureRelease) {
    _resizerCaptureRelease();
  }

  if (!val) return;

  const get_rel_coord = (screen_x: number) => {
    if (!tableRef.value) return 0;
    const bounds = tableRef.value.getBoundingClientRect();
    return screen_x - bounds.x - _scrollLeft;
  };

  const start_x_rel = get_rel_coord(startX ?? 0);

  const resizer = interactResizer.value;
  if (!resizer) return;
  if (resizer.captured) return;

  resizer.captured = true;

  _resizerCaptureMove = (e: MouseEvent) => {
    const new_x_rel = get_rel_coord(e.screenX);
    const new_shift = new_x_rel - start_x_rel;
    const col = props.columns.find((c) => c.name === resizer.name);
    if (!col) return;
    resizer.shiftX = Math.max(new_shift, MIN_COLUMN_WIDTH - (col.width ?? 0));
  };
  _resizeCaptureMouseUp = (_e: MouseEvent) => {
    const col = props.columns.find((c) => c.name === resizer.name);
    if (!col) return;
    const new_width = Math.max(
      MIN_COLUMN_WIDTH,
      (col.width ?? 0) + resizer.shiftX,
    );
    $emit('resizeColumn', {
      name: resizer.name,
      width: new_width,
    });

    if (_resizerCaptureRelease) {
      _resizerCaptureRelease();
    }
  };

  _resizerCaptureRelease = () => {
    document.body.classList.remove('ScrollableTable-resizerCaptured');
    if (_resizeCaptureMouseUp) {
      document.body.removeEventListener('mouseup', _resizeCaptureMouseUp);
    }
    if (_resizerCaptureMove) {
      document.body.removeEventListener('mousemove', _resizerCaptureMove);
    }
    _resizerCaptureMove = null;
    _resizeCaptureMouseUp = null;
    _resizerCaptureRelease = null;
    interactResizer.value = null;
  };

  document.body.classList.add('ScrollableTable-resizerCaptured');
  document.body.addEventListener('mouseup', _resizeCaptureMouseUp);
  document.body.addEventListener('mousemove', _resizerCaptureMove);
}

let elementsBoundsTracker: TrackElementBoundsHandler | null = null;
const tableRealHeaderReservedSpace = ref(0);
onMounted(() => {
  if (footerRef.value) {
    setScrollX(footerRef.value.scrollLeft);
  }
  if (tableRef.value) {
    elementsBoundsTracker = trackElementBounds(tableRef.value, (bbox) => {
      if (!tableRef.value) {
        tableRealHeaderReservedSpace.value = 0;
        return;
      }
      let headerSpace = parseInt(
        window
          .getComputedStyle(tableRef.value)
          .getPropertyValue('--header-reserved-space'),
      );
      if (isNaN(headerSpace)) headerSpace = 0;
      tableRealHeaderReservedSpace.value = Math.max(
        Math.min(headerSpace - bbox.y, Math.min(headerSpace, bbox.bottom)),
        0,
      );
    });
  }
});

onUnmounted(() => {
  resizerCapture(false);
  if (elementsBoundsTracker) {
    elementsBoundsTracker.cancel();
    elementsBoundsTracker = null;
  }
});
/*
export default defineComponent({
  name: 'ScrollableTable',
});*/
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ScrollableTable {
  --table-border: var(--local-border-color);
  --table-border-width: 1px;
  --table-bg: var(--local-bg-color);
  --table-real-header-reserved-space: 0px;
  display: flex;
  flex-direction: column;
}

.ScrollableTable-header,
.ScrollableTable-body,
.ScrollableTable-footer {
  display: grid;
  overflow: hidden;
}

.ScrollableTable-footer {
  overflow-x: auto;
}

.ScrollableTable-header-center,
.ScrollableTable-row-center {
  display: flex;
  overflow: hidden;
}
.ScrollableTable-footer-center {
  display: flex;
  overflow: hidden;
  overflow-x: auto;
}
.ScrollableTable-cell {
  position: relative;
  background: var(--table-bg);
  border-right: var(--table-border-width) solid var(--table-border);
  border-bottom: var(--table-border-width) solid var(--table-border);
  word-break: break-word;
  flex-shrink: 0;
  &:last-child {
    flex-grow: 1;
  }
  &[data-col='0'] {
    border-left: var(--table-border-width) solid var(--table-border);
  }
  &:not([data-pin]) + &[data-pin='right'] {
    border-left: var(--table-border-width) solid var(--table-border);
  }
}

.ScrollableTable-header {
  z-index: 60;
  position: sticky;
  top: var(--header-reserved-space, 0px);
  border-top: var(--table-border-width) solid var(--table-border);
}

.ScrollableTable-footer {
  z-index: 50;
  position: sticky;
  bottom: 0px;
}

.ScrollableTable-columnResizer {
  position: absolute;
  top: -1px;
  bottom: -1px;
  z-index: 80;
  width: 4px;
  right: -2px;
  background: #eee;
  transition: opacity 0.3s;
  opacity: 0;
  pointer-events: none;
  &.state-interact {
    opacity: 1;
    transform: translateX(var(--ScrollableTable-resizerShift));
  }
}

.ScrollableTable-cell[data-part='header'] .ScrollableTable-columnResizer {
  cursor: w-resize;
  pointer-events: all;
}

.ScrollableTable-headerReservedSpace {
  width: 100%;
  height: var(--ScrollableTable-headerReservedSpace, 0px);
  background: var(--local-bg-color);
  z-index: 59;
  position: sticky;
  top: 0;
  margin-bottom: calc(0px - var(--ScrollableTable-headerReservedSpace, 0px));
}
</style>

<style>
.ScrollableTable-resizerCaptured {
  cursor: w-resize;
  user-select: none;
}
</style>
