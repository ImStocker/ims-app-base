import type { AssetPropValueSelection } from '../../types/Props';
import {
  AssetPropWhereOpKind,
  type AssetPropWhere,
  type AssetPropWhereOp,
  type AssetPropWhereOpOr,
} from '../../types/PropsWhere';
import { assert } from '../../utils/typeUtils';
import {
  parse,
  type FilterExpr,
  type FilterExprFilter,
  type FilterExprStart,
  type FilterExprValue,
} from './filterParser';

export function highlightFilterExpression() {}

const ALLOWED_ROOT_FILTERS = [
  'id',
  'type',
  'inside',
  'blocks',
  'typeids',
  'workspaceids',
  'workspaceid',
  'name',
];

export function parseFilterExpression(
  val: string,
  options?: { trackLocations?: boolean },
): FilterExprStart | null {
  return val
    ? parse(val, {
        ...(options ? options : {}),
        rootFilters: ALLOWED_ROOT_FILTERS,
      })
    : null;
}

export function stringifyFilterExpression(expr: FilterExpr): string {
  switch (expr.type) {
    case 'filter': {
      let op: string;
      switch (expr.op) {
        case '=':
          op = ':';
          break;
        case '<':
          op = ':<';
          break;
        case '<=':
          op = ':<=';
          break;
        case '>':
          op = ':>';
          break;
        case '>=':
          op = ':>=';
          break;
        case '!=':
          op = ':<>';
          break;
      }
      return `${expr.path.join('.')}${op}${stringifyFilterExpression(expr.value)}`;
    }
    case 'const':
      return expr.content === null ? 'null' : expr.content.toString();
    case 'query':
      if (/([:"']|\sor\s|\sand\s)/.test(expr.content)) {
        return JSON.stringify(expr.content);
      } else return expr.content;

    default:
      throw new Error('Not implemented');
  }
}

export function convertFilterExprToPropWhere(
  filterExpr: FilterExpr,
): AssetPropWhere {
  switch (filterExpr.type) {
    case 'and':
    case 'or': {
      const left_where = convertFilterExprToPropWhere(filterExpr.left);
      const right_where = convertFilterExprToPropWhere(filterExpr.right);
      if (filterExpr.type === 'and') {
        const res = {
          ...left_where,
        };
        for (const [right_key, right_val] of Object.entries(right_where)) {
          let new_key = right_key;
          if (right_key === 'or') {
            let attempt = 1;
            while (res.hasOwnProperty(new_key)) {
              attempt++;
              new_key = 'or' + attempt;
            }
          }
          res[new_key] = right_val;
        }
        return res;
      } else {
        if (
          right_where.hasOwnProperty('or') &&
          right_where['or'] &&
          (right_where['or'] as AssetPropWhereOp).op ===
            AssetPropWhereOpKind.OR &&
          Object.keys(right_where).length === 1
        ) {
          return {
            or: {
              op: AssetPropWhereOpKind.OR,
              v: [left_where, ...(right_where['or'] as AssetPropWhereOpOr).v],
            },
          };
        } else {
          return {
            or: {
              op: AssetPropWhereOpKind.OR,
              v: [left_where, right_where],
            },
          };
        }
      }
    }
    case 'group': {
      return convertFilterExprToPropWhere(filterExpr.target);
    }
    case 'query':
      return {
        query: filterExpr.content,
      };
    case 'filter': {
      assert(filterExpr.path.length > 0);

      let primary = filterExpr.path[0].toString();
      const props: (string | number)[] = filterExpr.path.slice(1);
      if (primary === 'blocks') {
        primary = filterExpr.path[1].toString();
        props.shift();
      }
      const key = primary + (props.length > 0 ? '|' + props.join('\\') : '');
      if (filterExpr.value.type === 'const') {
        switch (filterExpr.op) {
          case '=':
            return {
              [key]: filterExpr.value.content,
            };
          case '!=':
            return {
              [key]: {
                op: AssetPropWhereOpKind.EQUAL_NOT,
                v: filterExpr.value.content,
              },
            };
          case '<':
            return {
              [key]: {
                op: AssetPropWhereOpKind.LESS,
                v: filterExpr.value.content as any,
              },
            };
          case '<=':
            return {
              [key]: {
                op: AssetPropWhereOpKind.LESS_EQUAL,
                v: filterExpr.value.content as any,
              },
            };
          case '>':
            return {
              [key]: {
                op: AssetPropWhereOpKind.MORE,
                v: filterExpr.value.content as any,
              },
            };
          case '>=':
            return {
              [key]: {
                op: AssetPropWhereOpKind.MORE_EQUAL,
                v: filterExpr.value.content as any,
              },
            };
        }
      } else if (filterExpr.value.type === 'range') {
        return {
          ['range-' + key]: {
            op: AssetPropWhereOpKind.AND,
            v: [
              {
                [key]: {
                  op: AssetPropWhereOpKind.MORE_EQUAL,
                  v: filterExpr.value.start.content,
                },
              },
              {
                [key]: {
                  op: AssetPropWhereOpKind.LESS,
                  v: filterExpr.value.end.content,
                },
              },
            ] as AssetPropWhere[],
          },
        };
      }
    }
  }
  return {};
}

export function getQueryAssetPropsSelection(
  query: string,
): AssetPropValueSelection | null {
  if (!query) return null;
  return {
    Str: stringifyFilterExpression({
      type: 'query',
      content: query,
    }),
    Where: {
      query,
    },
  };
}

export function setFilterInAssetPropsSelection(
  selection: AssetPropValueSelection | null,
  path: string[],
  value: FilterExprValue,
  op: FilterExprFilter['op'] = '=',
): AssetPropValueSelection {
  assert(value.type === 'const');
  const new_filter: FilterExpr = {
    type: 'filter',
    op,
    path,
    value,
  };
  const new_selection = {
    Str: selection ? selection.Str : '',
    Where: {
      ...(selection ? selection.Where : {}),
      ...convertFilterExprToPropWhere(new_filter),
    },
  };

  if (new_selection.Str !== undefined) {
    const parsed = parseFilterExpression(new_selection.Str, {
      trackLocations: true,
    });

    function find_and(expr: FilterExpr): FilterExprFilter | null {
      if (expr.type === 'filter') {
        if (expr.path.join('.') === path.join('.')) {
          return expr;
        }
        return null;
      } else if (expr.type === 'and') {
        const in_left = find_and(expr.left);
        if (in_left) return in_left;

        const in_right = find_and(expr.right);
        if (in_right) return in_right;
      }

      return null;
    }

    const stringified = stringifyFilterExpression(new_filter);
    const exists = parsed ? find_and(parsed) : null;
    if (exists) {
      assert(exists.location);
      new_selection.Str =
        new_selection.Str.substring(0, exists.location.start.offset) +
        stringified +
        new_selection.Str.substring(exists.location.end.offset);
    } else {
      if (new_selection.Str) {
        new_selection.Str += ' ' + stringified;
      } else new_selection.Str = stringified;
    }
  }

  return new_selection;
}
