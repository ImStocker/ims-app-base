import { AssetPropWhereOpKind } from '../../types/PropsWhere';
import {
  parseFilterExpression,
  stringifyFilterExpression,
  convertFilterExprToPropWhere,
  setFilterInAssetPropsSelection,
} from './filterExpression';

test('parseFilterExpression: block value sugar', () => {
  expect(parseFilterExpression('block:>30')).toEqual({
    type: 'filter',
    path: ['block', 'value'],
    op: '>',
    value: { type: 'const', content: 30, kind: 'int' },
  });
  expect(parseFilterExpression('block:30')).toEqual({
    type: 'filter',
    path: ['block', 'value'],
    op: '=',
    value: { type: 'const', content: 30, kind: 'int' },
  });
  expect(parseFilterExpression('someBlock:abc')).toEqual({
    type: 'filter',
    path: ['someBlock', 'value'],
    op: '=',
    value: { type: 'const', content: 'abc', kind: 'string' },
  });
});

test('parseFilterExpression: no sugar for root filters', () => {
  expect(parseFilterExpression('name:abc')).toEqual({
    type: 'filter',
    path: ['name'],
    op: '=',
    value: { type: 'const', content: 'abc', kind: 'string' },
  });
  expect(parseFilterExpression('type:ability')).toEqual({
    type: 'filter',
    path: ['type'],
    op: '=',
    value: { type: 'const', content: 'ability', kind: 'string' },
  });
});

test('parseFilterExpression: no sugar for explicit sub paths', () => {
  expect(parseFilterExpression('block.prop:abc')).toEqual({
    type: 'filter',
    path: ['block', 'prop'],
    op: '=',
    value: { type: 'const', content: 'abc', kind: 'string' },
  });
  expect(parseFilterExpression('block[0]:abc')).toEqual({
    type: 'filter',
    path: ['block', 0],
    op: '=',
    value: { type: 'const', content: 'abc', kind: 'string' },
  });
});

test('parseFilterExpression: no sugar for queries', () => {
  expect(parseFilterExpression('some text')).toEqual({
    type: 'query',
    content: 'some text',
  });
});

test('parseFilterExpression: sugar inside composite expressions', () => {
  expect(parseFilterExpression('type:ability block:>30')).toEqual({
    type: 'and',
    left: {
      type: 'filter',
      path: ['type'],
      op: '=',
      value: { type: 'const', content: 'ability', kind: 'string' },
    },
    right: {
      type: 'filter',
      path: ['block', 'value'],
      op: '>',
      value: { type: 'const', content: 30, kind: 'int' },
    },
  });
});

test('stringifyFilterExpression: block value sugar', () => {
  expect(
    stringifyFilterExpression({
      type: 'filter',
      path: ['block', 'value'],
      op: '>',
      value: { type: 'const', content: 30, kind: 'int' },
    }),
  ).toBe('block.value:>30');
});

test('convertFilterExprToPropWhere: block value sugar', () => {
  expect(
    convertFilterExprToPropWhere(parseFilterExpression('block:>30')!),
  ).toEqual({
    'block|value': {
      op: AssetPropWhereOpKind.MORE,
      v: 30,
    },
  });
});

test('setFilterInAssetPropsSelection: one value', () => {
  const original_filter = `type:ability`;
  const original_selection = {
    Str: original_filter,
    Where: {
      type: 'ability',
    },
  };
  const new_selection = setFilterInAssetPropsSelection(
    original_selection,
    ['type'],
    {
      type: 'const',
      kind: 'string',
      content: 'enemy',
    },
  );
  expect(new_selection).toEqual({
    Str: 'type:enemy',
    Where: {
      type: 'enemy',
    },
  });
});

test('setFilterInAssetPropsSelection: append', () => {
  const original_filter = `query`;
  const original_selection = {
    Str: original_filter,
    Where: {
      query: 'query',
    },
  };
  const new_selection = setFilterInAssetPropsSelection(
    original_selection,
    ['type'],
    {
      type: 'const',
      kind: 'string',
      content: 'enemy',
    },
  );
  expect(new_selection).toEqual({
    Str: 'query type:enemy',
    Where: {
      query: 'query',
      type: 'enemy',
    },
  });
});

test('setFilterInAssetPropsSelection: change in place', () => {
  const original_filter = `query type:ability inside:123`;
  const original_selection = {
    Str: original_filter,
    Where: {
      query: 'query',
      type: 'ability',
      inside: '123',
    },
  };
  const new_selection = setFilterInAssetPropsSelection(
    original_selection,
    ['type'],
    {
      type: 'const',
      kind: 'string',
      content: 'enemy',
    },
  );
  expect(new_selection).toEqual({
    Str: 'query type:enemy inside:123',
    Where: {
      query: 'query',
      type: 'enemy',
      inside: '123',
    },
  });
});
