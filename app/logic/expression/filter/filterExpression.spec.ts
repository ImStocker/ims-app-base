import { setFilterInAssetPropsSelection } from './filterExpression';

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
