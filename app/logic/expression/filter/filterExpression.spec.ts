import { AssetPropWhereOpKind } from '../../types/PropsWhere';
import {
  parseFilterExpression,
  stringifyFilterExpression,
  convertFilterExprToPropWhere,
  setFilterInAssetPropsSelection,
  splitTopLevelQuery,
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

describe('splitTopLevelQuery', () => {
  test('splits a top level query out of a conjunction', () => {
    expect(splitTopLevelQuery('inside:abc xxx')).toEqual({
      find: 'xxx',
      where: 'inside:abc',
    });
  });

  test('query only goes to find', () => {
    expect(splitTopLevelQuery('xxx')).toEqual({ find: 'xxx', where: '' });
  });

  test('no query keeps everything in where', () => {
    expect(splitTopLevelQuery('inside:abc')).toEqual({
      find: '',
      where: 'inside:abc',
    });
    expect(splitTopLevelQuery('yyy:das')).toEqual({
      find: '',
      where: 'yyy:das',
    });
  });

  test('several queries separated by filters are joined in find', () => {
    expect(splitTopLevelQuery('aaa inside:c bbb')).toEqual({
      find: 'aaa bbb',
      where: 'inside:c',
    });
  });

  test('non top level query is not split', () => {
    expect(splitTopLevelQuery('a OR b')).toEqual({
      find: '',
      where: 'a OR b',
    });
    expect(splitTopLevelQuery('NOT xxx')).toEqual({
      find: '',
      where: 'NOT xxx',
    });
    expect(splitTopLevelQuery('(xxx)')).toEqual({
      find: '',
      where: '(xxx)',
    });
  });

  test('query inside a group next to a top level query still splits', () => {
    expect(splitTopLevelQuery('(x) y')).toEqual({
      find: 'y',
      where: '(x)',
    });
  });

  test('empty and unparsable input is kept in where', () => {
    expect(splitTopLevelQuery('')).toEqual({ find: '', where: '' });
    expect(splitTopLevelQuery('   ')).toEqual({ find: '', where: '' });
    expect(splitTopLevelQuery('  inside:c   xxx  ')).toEqual({
      find: 'xxx',
      where: 'inside:c',
    });
  });

  test('where part stays parseable', () => {
    const { where } = splitTopLevelQuery('type:ability block:>30 hello');
    expect(where).toBe('type:ability block:>30');
    expect(parseFilterExpression(where)).not.toBeNull();
  });
});
