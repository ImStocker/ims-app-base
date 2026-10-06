import {
  castAssetPropPlainObjectValueToString,
  castAssetPropValueToAccount,
  castAssetPropValueToArray,
  castAssetPropValueToAsset,
  castAssetPropValueToBoolean,
  castAssetPropValueToDate,
  castAssetPropValueToEnum,
  castAssetPropValueToFloat,
  castAssetPropValueToInt,
  castAssetPropValueToText,
  castAssetPropValueToString,
  castAssetPropValueToTimestamp,
} from './Props';

const ASSET_ID = '052d1d35-4072-4286-af97-8799b0bfdcaa';
const ACCOUNT_ID = 'b8a3e9d3-2f4c-4a86-9d3e-1c2b3a4d5e6f';
const BLOCK_ID = 'a98a740e-94c0-449a-bea8-f033a45000d5';

const TIMESTAMP = {
  Str: '2024-01-01T00:00:00.000Z',
  Ts: 1704067200,
};

test('castAssetPropValueToString renders plain objects as JSON', () => {
  expect(castAssetPropValueToString({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  expect(castAssetPropValueToString({})).toBe('{}');
  expect(castAssetPropValueToString({ a: { b: [1, 2] } })).toBe(
    '{"a":{"b":[1,2]}}',
  );
});

test('castAssetPropValueToString keeps array[N] for arrays', () => {
  expect(castAssetPropValueToString([1, 2])).toBe('array[2]');
  expect(castAssetPropValueToString([{ a: 1 }, { b: 2 }])).toBe('array[2]');
  expect(castAssetPropValueToString([])).toBe('array[0]');
});

test('castAssetPropValueToString keeps scalar behavior', () => {
  expect(castAssetPropValueToString(null)).toBe('');
  expect(castAssetPropValueToString(undefined)).toBe('');
  expect(castAssetPropValueToString('text')).toBe('text');
  expect(castAssetPropValueToString(42)).toBe('42');
  expect(castAssetPropValueToString(true)).toBe('1');
  expect(castAssetPropValueToString(false)).toBe('0');
  expect(castAssetPropValueToString({ Str: 'hi', Ops: [] })).toBe('hi');
  expect(castAssetPropValueToString(TIMESTAMP)).toBe(TIMESTAMP.Str);
  expect(castAssetPropValueToString({ Enum: 'e', Name: 'N' })).toBe('N');
});

test('castAssetPropValueToString renders assets as markdown links', () => {
  expect(
    castAssetPropValueToString({ AssetId: ASSET_ID, Title: 'T', Name: null }),
  ).toBe(`[T](#asset:${ASSET_ID})`);
  expect(
    castAssetPropValueToString({
      AssetId: ASSET_ID,
      Title: 'T',
      Name: null,
      BlockId: BLOCK_ID,
      Anchor: 'a1',
    }),
  ).toBe(`[T](#asset:${ASSET_ID}#block:${BLOCK_ID}~anchor:a1)`);
});

test('castAssetPropPlainObjectValueToString joins arrays with ", "', () => {
  expect(castAssetPropPlainObjectValueToString([1, 'x'])).toBe('1, x');
  expect(castAssetPropPlainObjectValueToString([{ a: 1 }, { b: 2 }])).toBe(
    '{"a":1}, {"b":2}',
  );
  expect(castAssetPropPlainObjectValueToString([[1, 2], [3]])).toBe('1, 2, 3');
  expect(castAssetPropPlainObjectValueToString([])).toBe('');
});

test('castAssetPropPlainObjectValueToString delegates non-arrays', () => {
  expect(castAssetPropPlainObjectValueToString({ a: 1 })).toBe('{"a":1}');
  expect(castAssetPropPlainObjectValueToString(undefined)).toBe('');
  expect(castAssetPropPlainObjectValueToString(null)).toBe('');
  expect(castAssetPropPlainObjectValueToString({ Enum: 'e', Name: 'N' })).toBe(
    'N',
  );
});

test('castAssetPropValueToInt', () => {
  expect(castAssetPropValueToInt(3.7)).toBe(4);
  expect(castAssetPropValueToInt('42')).toBe(42);
  expect(castAssetPropValueToInt(true)).toBe(1);
  expect(castAssetPropValueToInt(false)).toBe(0);
  expect(castAssetPropValueToInt(TIMESTAMP)).toBe(TIMESTAMP.Ts);
  expect(castAssetPropValueToInt('abc')).toBeNull();
  expect(castAssetPropValueToInt({ a: 1 })).toBeNull();
  expect(castAssetPropValueToInt([1, 2])).toBeNull();
  expect(castAssetPropValueToInt(undefined)).toBeNull();
  expect(castAssetPropValueToInt(null)).toBeNull();
});

test('castAssetPropValueToFloat', () => {
  expect(castAssetPropValueToFloat(3.5)).toBe(3.5);
  expect(castAssetPropValueToFloat('2.5')).toBe(2.5);
  expect(castAssetPropValueToFloat(TIMESTAMP)).toBe(TIMESTAMP.Ts);
  expect(castAssetPropValueToFloat(true)).toBe(1);
  expect(castAssetPropValueToFloat({ a: 1 })).toBeNull();
  expect(castAssetPropValueToFloat([1, 2])).toBeNull();
  expect(castAssetPropValueToFloat(undefined)).toBeNull();
});

test('castAssetPropValueToBoolean', () => {
  expect(castAssetPropValueToBoolean({})).toBe(true);
  expect(castAssetPropValueToBoolean([])).toBe(true);
  expect(castAssetPropValueToBoolean('x')).toBe(true);
  expect(castAssetPropValueToBoolean(1)).toBe(true);
  expect(castAssetPropValueToBoolean(0)).toBe(false);
  expect(castAssetPropValueToBoolean('')).toBe(false);
  expect(castAssetPropValueToBoolean('0')).toBe(false);
  expect(castAssetPropValueToBoolean(false)).toBe(false);
  expect(castAssetPropValueToBoolean(null)).toBe(false);
  expect(castAssetPropValueToBoolean(undefined)).toBe(false);
});

test('castAssetPropValueToText renders plain values as text', () => {
  expect(castAssetPropValueToText({ a: 1 })).toEqual({
    Str: '{"a":1}\n',
    Ops: [{ insert: '{"a":1}\n' }],
  });
  expect(castAssetPropValueToText([1, 2])).toEqual({
    Str: 'array[2]\n',
    Ops: [{ insert: 'array[2]\n' }],
  });
  expect(castAssetPropValueToText('hi')).toEqual({
    Str: 'hi\n',
    Ops: [{ insert: 'hi\n' }],
  });
});

test('castAssetPropValueToText keeps text and typed values', () => {
  const text = { Str: 'hi', Ops: [{ insert: 'hi' }] };
  expect(castAssetPropValueToText(text)).toEqual(text);
  expect(castAssetPropValueToText(TIMESTAMP)).toEqual({
    Str: TIMESTAMP.Str,
    Ops: [{ insert: { prop: { value: TIMESTAMP, inline: true } } }],
  });
});

test('castAssetPropValueToTimestamp', () => {
  expect(castAssetPropValueToTimestamp(TIMESTAMP)).toEqual(TIMESTAMP);
  expect(castAssetPropValueToTimestamp(1704067200)).toEqual({
    Str: '2024-01-01T00:00:00.000Z',
    Ts: 1704067200000,
  });
  expect(castAssetPropValueToTimestamp('2024-01-01T00:00:00.000Z')).toEqual({
    Str: '2024-01-01T00:00:00.000Z',
    Ts: 1704067200,
  });
  expect(castAssetPropValueToTimestamp({ a: 1 })).toBeNull();
  expect(castAssetPropValueToTimestamp([1, 2])).toBeNull();
  expect(castAssetPropValueToTimestamp(undefined)).toBeNull();
  expect(castAssetPropValueToTimestamp(null)).toBeNull();
});

test('castAssetPropValueToDate', () => {
  expect(castAssetPropValueToDate(TIMESTAMP)).toEqual(
    new Date('2024-01-01T00:00:00.000Z'),
  );
  expect(castAssetPropValueToDate({ a: 1 })).toBeNull();
  expect(castAssetPropValueToDate(undefined)).toBeNull();
});

test('castAssetPropValueToEnum accepts structural matches only', () => {
  const enumeration = { Enum: 'e', Name: 'N' };
  expect(castAssetPropValueToEnum(enumeration)).toEqual(enumeration);
  expect(castAssetPropValueToEnum({ a: 1 })).toBeNull();
  expect(castAssetPropValueToEnum([])).toBeNull();
  expect(castAssetPropValueToEnum(undefined)).toBeNull();
});

test('castAssetPropValueToAccount accepts structural matches only', () => {
  const account = { AccountId: ACCOUNT_ID, Name: 'A' };
  expect(castAssetPropValueToAccount(account)).toEqual(account);
  expect(castAssetPropValueToAccount({ a: 1 })).toBeNull();
  expect(castAssetPropValueToAccount([1])).toBeNull();
  expect(castAssetPropValueToAccount(undefined)).toBeNull();
});

test('castAssetPropValueToAsset', () => {
  const asset = { AssetId: ASSET_ID, Title: 'T', Name: null };
  expect(castAssetPropValueToAsset(asset)).toEqual(asset);
  expect(castAssetPropValueToAsset(`[T](#asset:${ASSET_ID})`)).toEqual({
    Title: 'T',
    AssetId: ASSET_ID,
    Name: null,
    BlockId: undefined,
    Anchor: undefined,
  });
  expect(
    castAssetPropValueToAsset(
      `[T](#asset:${ASSET_ID}#block:${BLOCK_ID}~anchor:a1)`,
    ),
  ).toEqual({
    Title: 'T',
    AssetId: ASSET_ID,
    Name: null,
    BlockId: BLOCK_ID,
    Anchor: 'a1',
  });
  expect(castAssetPropValueToAsset({ a: 1 })).toBeNull();
  expect(castAssetPropValueToAsset([1])).toBeNull();
  expect(castAssetPropValueToAsset(undefined)).toBeNull();
});

test('castAssetPropValueToArray', () => {
  expect(castAssetPropValueToArray([1, 2])).toEqual([1, 2]);
  expect(castAssetPropValueToArray([{ a: 1 }])).toEqual([{ a: 1 }]);
  expect(castAssetPropValueToArray({ a: 1 })).toEqual([]);
  expect(castAssetPropValueToArray(42)).toEqual([]);
  expect(castAssetPropValueToArray(null)).toEqual([]);
  expect(castAssetPropValueToArray(undefined)).toEqual([]);
});
