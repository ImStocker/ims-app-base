import type { DeltaInsertOp } from './../DeltaInsertOp';

export class InlineGroup {
  readonly ops: DeltaInsertOp[];
  constructor(ops: DeltaInsertOp[]) {
    this.ops = ops;
  }
}

export class SingleItem {
  readonly op: DeltaInsertOp;
  constructor(op: DeltaInsertOp) {
    this.op = op;
  }
}
export class VideoItem extends SingleItem {}
export class BlotBlock extends SingleItem {}

export class BlockGroup {
  readonly op: DeltaInsertOp;
  ops: DeltaInsertOp[];
  constructor(op: DeltaInsertOp, ops: DeltaInsertOp[]) {
    this.op = op;
    this.ops = ops;
  }
}

export class ListGroup {
  items: ListItem[];
  constructor(items: ListItem[]) {
    this.items = items;
  }
}

export class ListItem {
  readonly item: BlockGroup;
  innerList: ListGroup | null;
  constructor(item: BlockGroup, innerList: ListGroup | null = null) {
    this.item = item;
    this.innerList = innerList;
  }
}

export class TableGroup {
  rows: TableRow[];
  constructor(rows: TableRow[]) {
    this.rows = rows;
  }
}

export class TableRow {
  cells: TableCell[];
  constructor(cells: TableCell[]) {
    this.cells = cells;
  }
}

export class TableCell {
  readonly item: BlockGroup;
  constructor(item: BlockGroup) {
    this.item = item;
  }
}

export type TDataGroup =
  | VideoItem
  | InlineGroup
  | BlockGroup
  | ListItem
  | ListGroup
  | TableGroup
  | TableRow
  | TableCell;
