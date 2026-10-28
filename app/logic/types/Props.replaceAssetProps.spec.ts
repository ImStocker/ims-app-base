import { replaceAssetProps, assetPropsContainValue } from './Props';

const opts = (wholeProp = false, ignoreCase = false) => ({ wholeProp, ignoreCase });

describe('replaceAssetProps - single value', () => {
  test('substring replace in a string value (wholeProp=false)', () => {
    const props = { text: 'Some old text' };
    const res = replaceAssetProps(props, { '': 'old' }, { '': 'new' }, opts(false));
    expect(res).toEqual({ text: 'Some new text' });
  });

  test('whole value replace (wholeProp=true)', () => {
    const props = { text: 'old' };
    const res = replaceAssetProps(props, { '': 'old' }, { '': 'new' }, opts(true));
    expect(res).toEqual({ text: 'new' });
  });

  test('no match leaves all keys unchanged by reference-ish', () => {
    const props = { text: 'hello' };
    const res = replaceAssetProps(props, { '': 'old' }, { '': 'new' }, opts(false));
    expect(res).toEqual({ text: 'hello' });
  });

  test('ignoreCase substring replace', () => {
    const props = { text: 'Some OLD text' };
    const res = replaceAssetProps(props, { '': 'old' }, { '': 'new' }, opts(false, true));
    expect(res).toEqual({ text: 'Some new text' });
  });

  test('leaf object identity: AssetId matches despite different Title', () => {
    const props = {
      asset: { AssetId: 'a1', Title: 'first' } as any,
    };
    const find = { '': { AssetId: 'a1', Title: 'other' } as any };
    const replace = { '': { AssetId: 'a2', Title: 'second' } as any };
    const res = replaceAssetProps(props, find, replace, opts(true));
    expect(res).toEqual({ asset: { AssetId: 'a2', Title: 'second' } });
  });

  test('non-whole string find does not touch leaf objects', () => {
    const props = {
      asset: { AssetId: 'a1', Title: 'text' } as any,
    };
    const res = replaceAssetProps(props, { '': 'text' }, { '': 'NEW' }, opts(false));
    expect(res).toEqual(props);
  });

  test('TEXT prop substring replace in Str and Ops', () => {
    const props = {
      rich: { Str: 'hello world', Ops: [{ insert: 'hello' }] } as any,
    };
    const res = replaceAssetProps(props, { '': 'hello' }, { '': 'hi' }, opts(false));
    expect((res.rich as any).Str).toBe('hi world');
    expect((res.rich as any).Ops[0].insert).toBe('hi');
  });
});

describe('replaceAssetProps - structural', () => {
  test('replace struct with array (user example)', () => {
    const props = {
      text: 'Some text field',
      val: [''] as any,
      'val\\xxx': 'text',
      asset: { AssetId: 'x', Title: 't' } as any,
    };
    const find = { '': [''] as any, '\\xxx': 'text' };
    const replace = { '': [0, 1] as any, '\\0': 5, '\\1': 4 };
    const res = replaceAssetProps(props, find, replace, opts(true));
    expect(res).toEqual({
      text: 'Some text field',
      val: [0, 1],
      'val\\0': 5,
      'val\\1': 4,
      asset: { AssetId: 'x', Title: 't' },
    });
    expect(res['val\\xxx']).toBeUndefined();
  });

  test('array find with differing needle/haystack indices (order based)', () => {
    // haystack: val = [3, 7], val\3 = 'a', val\7 = 'b'
    const props = {
      val: [3, 7] as any,
      'val\\3': 'a',
      'val\\7': 'b',
    };
    // needle: [0, 1], \0='a', \1='b'
    const find = { '': [0, 1] as any, '\\0': 'a', '\\1': 'b' };
    const replace = { '': [0, 1] as any, '\\0': 'A', '\\1': 'B' };
    const res = replaceAssetProps(props, find, replace, opts(true));
    expect(res.val).toEqual([0, 1]);
    expect(res['val\\0']).toBe('A');
    expect(res['val\\1']).toBe('B');
    expect(res['val\\3']).toBeUndefined();
    expect(res['val\\7']).toBeUndefined();
  });

  test('array find does not match when order differs', () => {
    const props = {
      val: [3, 7] as any,
      'val\\3': 'a',
      'val\\7': 'b',
    };
    const find = { '': [0, 1] as any, '\\0': 'b', '\\1': 'a' };
    const replace = { '': [0, 1] as any, '\\0': 'X', '\\1': 'Y' };
    const res = replaceAssetProps(props, find, replace, opts(true));
    expect(res).toEqual(props);
  });

  test('no match returns a full copy of all keys', () => {
    const props = { a: 1, 'a\\x': 2 };
    const find = { '': [''] as any, '\\y': 999 };
    const replace = { '': [''] as any, '\\y': 0 };
    const res = replaceAssetProps(props, find, replace, opts(true));
    expect(res).toEqual(props);
    expect(res).not.toBe(props);
  });
});

describe('assetPropsContainValue - structural', () => {
  test('contains struct pattern', () => {
    const props = { val: [''] as any, 'val\\xxx': 'text' };
    const find = { '': [''] as any, '\\xxx': 'text' };
    expect(assetPropsContainValue(props, find, opts(true))).toBe(true);
  });

  test('contains single value', () => {
    const props = { text: 'hello' };
    expect(assetPropsContainValue(props, { '': 'ell' }, opts(false))).toBe(true);
    expect(assetPropsContainValue(props, { '': 'zzz' }, opts(false))).toBe(false);
  });

  test('contains array pattern', () => {
    const props = { val: [3, 7] as any, 'val\\3': 'a', 'val\\7': 'b' };
    const find = { '': [0, 1] as any, '\\0': 'a', '\\1': 'b' };
    expect(assetPropsContainValue(props, find, opts(true))).toBe(true);
  });
});
