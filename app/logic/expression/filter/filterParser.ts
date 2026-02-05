export { parse } from './filterParser.mjs';

export type ExprLocationCoord = {
  offset: number;
  line: number;
  column: number;
};

export type ExprLocation = {
  start: ExprLocationCoord;
  end: ExprLocationCoord;
};

export type FilterExprQuery = {
  type: 'query';
  content: string;
  location?: ExprLocation;
};

export type FilterExprAnd = {
  type: 'and';
  left: FilterExpr;
  right: FilterExpr;
  location?: ExprLocation;
};

export type FilterExprOr = {
  type: 'or';
  left: FilterExpr;
  right: FilterExpr;
  location?: ExprLocation;
};

export type FilterExprNot = {
  type: 'not';
  target: FilterExpr;
  location?: ExprLocation;
};

export type FilterExprGroup = {
  type: 'group';
  target: FilterExpr;
  location?: ExprLocation;
};

export type FilterExprFilter = {
  type: 'filter';
  path: (string | number)[];
  op: '=' | '!=' | '<' | '>' | '<=' | '>=';
  value: FilterExprValue;
  location?: ExprLocation;
};

export type FilterExprRange = {
  type: 'range';
  start: FilterExprConst;
  end: FilterExprConst;
  location?: ExprLocation;
};

export type FilterExprConst =
  | {
      type: 'const';
      content: boolean;
      kind: 'bool';
      location?: ExprLocation;
    }
  | {
      type: 'const';
      content: number;
      kind: 'int' | 'float';
      location?: ExprLocation;
    }
  | {
      type: 'const';
      content: string;
      kind: 'string' | 'date' | 'uuid';
      location?: ExprLocation;
    }
  | {
      type: 'const';
      content: null;
      kind: 'null';
      location?: ExprLocation;
    };

export type FilterExprValue = FilterExprConst | FilterExprRange;

export type FilterExprStart =
  | FilterExprAnd
  | FilterExprOr
  | FilterExprQuery
  | FilterExprNot
  | FilterExprGroup
  | FilterExprFilter;

export type FilterExpr = FilterExprStart | FilterExprValue;

declare module './filterParser.mjs' {
  function parse(
    input: string,
    options?: { trackLocations?: boolean; rootFilters?: string[] },
  ): FilterExprStart;
}
