import { findAssetPropsMatches, AssetProps } from './Props';

const opts = (wholeProp = false, ignoreCase = false) => ({ wholeProp, ignoreCase });

describe('findAssetPropsMatches - legacy single value', () => {
  test('substring match reports every matching key with its value', () => {
    const props: AssetProps = {
      text: 'Some old text',
      other: 'nothing here',
      'deep\\nested\\key': 'old text inside',
    };
    const res = findAssetPropsMatches(props, { '': 'old' }, opts(false));
    expect(res).toEqual([
      { prop: 'text', value: 'Some old text' },
      { prop: 'deep\\nested\\key', value: 'old text inside' },
    ]);
  });

  test('wholeProp requires full value equality', () => {
    const props: AssetProps = { a: 'old', b: 'old text' };
    expect(findAssetPropsMatches(props, { '': 'old' }, opts(true))).toEqual([
      { prop: 'a', value: 'old' },
    ]);
  });

  test('ignoreCase matches lowercase needle', () => {
    const props: AssetProps = { a: 'Some OLD text' };
    expect(findAssetPropsMatches(props, { '': 'old' }, opts(false, true))).toEqual([
      { prop: 'a', value: 'Some OLD text' },
    ]);
    expect(findAssetPropsMatches(props, { '': 'old' }, opts(false, false))).toEqual([]);
  });

  test('no match returns empty array', () => {
    const props: AssetProps = { a: 'hello' };
    expect(findAssetPropsMatches(props, { '': 'zzz' }, opts(false))).toEqual([]);
  });

  test('TEXT value matches needle in Str and reports the whole value', () => {
    const props: AssetProps = {
      rich: { Str: 'hello world', Ops: [{ insert: 'hello' }] } as any,
    };
    const res = findAssetPropsMatches(props, { '': 'hello' }, opts(false));
    expect(res).toHaveLength(1);
    expect(res[0].prop).toBe('rich');
    expect((res[0].value as any).Str).toBe('hello world');
  });

  test('needle found only in Ops string insert still matches', () => {
    const props: AssetProps = {
      rich: { Str: ' visible', Ops: [{ insert: 'hidden-token', attributes: { bold: true } }] } as any,
    };
    const res = findAssetPropsMatches(props, { '': 'hidden-token' }, opts(false));
    expect(res).toHaveLength(1);
    expect(res[0].prop).toBe('rich');
  });

  test('leaf object matches by identity key ignoring Title', () => {
    const props: AssetProps = {
      link: { AssetId: 'a1', Title: 'first' } as any,
      other: { AssetId: 'a2', Title: 'second' } as any,
    };
    const res = findAssetPropsMatches(
      props,
      { '': { AssetId: 'a1', Title: 'different' } as any },
      opts(true),
    );
    expect(res).toEqual([{ prop: 'link', value: { AssetId: 'a1', Title: 'first' } as any }]);
  });

  test('null needle matches null values only', () => {
    const props: AssetProps = { a: null, b: 'x' };
    expect(findAssetPropsMatches(props, { '': null }, opts(false))).toEqual([
      { prop: 'a', value: null },
    ]);
  });

  test('empty pattern (no keys) matches nothing', () => {
    const props: AssetProps = { a: 'hello' };
    expect(findAssetPropsMatches(props, {}, opts(false))).toEqual([]);
  });
});

describe('findAssetPropsMatches - structural', () => {
  test('struct pattern reports the matched root with its own value', () => {
    const props: AssetProps = {
      val: [''] as any,
      'val\\xxx': 'text',
      other: 1,
    };
    const find = { '': [''] as any, '\\xxx': 'text' };
    expect(findAssetPropsMatches(props, find, opts(true))).toEqual([
      { prop: 'val', value: [''] as any },
    ]);
  });

  test('array pattern with differing indices reports the root', () => {
    const props: AssetProps = {
      val: [3, 7] as any,
      'val\\3': 'a',
      'val\\7': 'b',
    };
    const find = { '': [0, 1] as any, '\\0': 'a', '\\1': 'b' };
    expect(findAssetPropsMatches(props, find, opts(true))).toEqual([
      { prop: 'val', value: [3, 7] as any },
    ]);
  });

  test('array pattern does not match when order differs', () => {
    const props: AssetProps = {
      val: [3, 7] as any,
      'val\\3': 'a',
      'val\\7': 'b',
    };
    const find = { '': [0, 1] as any, '\\0': 'b', '\\1': 'a' };
    expect(findAssetPropsMatches(props, find, opts(true))).toEqual([]);
  });

  test('structural find with no root value entry matches roots having the child', () => {
    const props: AssetProps = {
      'a\\xxx': 'text',
      'b\\xxx': 'other',
    };
    const find = { '\\xxx': 'text' } as AssetProps;
    const res = findAssetPropsMatches(props, find, opts(false));
    expect(res).toHaveLength(1);
    expect(res[0].prop).toBe('a');
  });

  test('multiple matched roots are all reported', () => {
    const props: AssetProps = {
      v1: [''] as any,
      'v1\\xxx': 'text',
      v2: [''] as any,
      'v2\\xxx': 'text',
      v3: [''] as any,
      'v3\\xxx': 'nope',
    };
    const find = { '': [''] as any, '\\xxx': 'text' };
    const res = findAssetPropsMatches(props, find, opts(true));
    expect(res.map((m) => m.prop)).toEqual(['v1', 'v2']);
  });
});
