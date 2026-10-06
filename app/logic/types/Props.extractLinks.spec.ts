import {
  extractAssetLinksFromMarkdown,
  extractAssetLinksFromProps,
} from './Props';

const ASSET_ID = '052d1d35-4072-4286-af97-8799b0bfdcaa';
const ASSET_ID_2 = 'b8a3e9d1-2f4c-4a86-9d3e-1c2b3a4d5e6f';
const BLOCK_ID = 'a98a740e-94c0-449a-bea8-f033a45000d5';

test('extracts asset wiki link from markdown', () => {
  expect(
    extractAssetLinksFromMarkdown(`См. [[asset:${ASSET_ID}|Воин]] и ещё раз.`),
  ).toEqual([
    {
      assetId: ASSET_ID,
      blockId: null,
      anchor: null,
      label: 'Воин',
    },
  ]);
});

test('extracts multiple asset wiki links from markdown', () => {
  expect(
    extractAssetLinksFromMarkdown(
      `[[asset:${ASSET_ID}|Первый]]\n[[asset:${ASSET_ID_2}|Второй]]`,
    ),
  ).toEqual([
    {
      assetId: ASSET_ID,
      blockId: null,
      anchor: null,
      label: 'Первый',
    },
    {
      assetId: ASSET_ID_2,
      blockId: null,
      anchor: null,
      label: 'Второй',
    },
  ]);
});

test('extracts asset wiki link with escaped pipe separator', () => {
  expect(
    extractAssetLinksFromMarkdown(`| [[asset:${ASSET_ID}\\|Воин]] |`),
  ).toEqual([
    {
      assetId: ASSET_ID,
      blockId: null,
      anchor: null,
      label: 'Воин',
    },
  ]);
});

test('extracts asset wiki link without label', () => {
  expect(extractAssetLinksFromMarkdown(`[[asset:${ASSET_ID}]]`)).toEqual([
    {
      assetId: ASSET_ID,
      blockId: null,
      anchor: null,
      label: '',
    },
  ]);
});

test('extracts block id from wiki link fragment', () => {
  expect(
    extractAssetLinksFromMarkdown(
      `[[asset:${ASSET_ID}#bid-${BLOCK_ID}~hero|Воин]]`,
    ),
  ).toEqual([
    {
      assetId: ASSET_ID,
      blockId: BLOCK_ID,
      anchor: 'hero',
      label: 'Воин',
    },
  ]);
});

test('extracts header anchor from wiki link fragment', () => {
  expect(
    extractAssetLinksFromMarkdown(`[[asset:${ASSET_ID}#Раздел|Воин]]`),
  ).toEqual([
    {
      assetId: ASSET_ID,
      blockId: null,
      anchor: 'Раздел',
      label: 'Воин',
    },
  ]);
});

test('ignores non asset wiki links in markdown', () => {
  expect(
    extractAssetLinksFromMarkdown(
      `[[t:Markdown]] [[asset:not-a-uuid|Bad]] [[asset:asset]] [[foo]]`,
    ),
  ).toEqual([]);
});

test('dedupes identical wiki links in markdown', () => {
  expect(
    extractAssetLinksFromMarkdown(
      `[[asset:${ASSET_ID}|Воин]] и [[asset:${ASSET_ID}|Опять]]`,
    ),
  ).toHaveLength(1);
});

test('extracts links from markdown string prop', () => {
  expect(
    extractAssetLinksFromProps({
      value: `# Описание\n\n[[asset:${ASSET_ID}|Воин]]`,
    }),
  ).toEqual([
    {
      blockProp: 'value',
      targetAssetId: ASSET_ID,
      targetBlockId: null,
      targetAnchor: null,
      type: 'mention',
    },
  ]);
});

test('extracts links from rich text ops', () => {
  expect(
    extractAssetLinksFromProps({
      text: {
        Str: 'Воин',
        Ops: [
          {
            insert: 'Воин',
            attributes: {
              asset: {
                value: { AssetId: ASSET_ID, Title: 'Воин', Name: null },
              },
            },
          },
        ],
      },
    }),
  ).toEqual([
    {
      blockProp: 'text',
      targetAssetId: ASSET_ID,
      targetBlockId: null,
      targetAnchor: null,
      type: 'mention',
    },
  ]);
});

test('extracts task and prop links from rich text ops', () => {
  expect(
    extractAssetLinksFromProps({
      text: {
        Str: '',
        Ops: [
          { insert: { task: { value: { AssetId: ASSET_ID, Title: 'A' } } } },
          {
            insert: {
              prop: {
                value: { AssetId: ASSET_ID_2, Title: 'B', Name: null },
              },
            },
          },
        ],
      },
    }),
  ).toEqual([
    {
      blockProp: 'text',
      targetAssetId: ASSET_ID,
      targetBlockId: null,
      targetAnchor: null,
      type: 'mention',
    },
    {
      blockProp: 'text',
      targetAssetId: ASSET_ID_2,
      targetBlockId: null,
      targetAnchor: null,
      type: 'mention',
    },
  ]);
});

test('extracts mention from rich text ops', () => {
  expect(
    extractAssetLinksFromProps({
      text: {
        Str: '@user',
        Ops: [
          {
            insert: {
              mention: { id: ASSET_ID, accountId: '42', name: 'user' },
            },
          },
        ],
      },
    }),
  ).toEqual([
    {
      mention: { id: ASSET_ID, accountId: '42', name: 'user' },
    },
  ]);
});

test('extracts link from asset prop value', () => {
  expect(
    extractAssetLinksFromProps({
      link: { AssetId: ASSET_ID, Title: 'Воин', Name: null },
    }),
  ).toEqual([
    {
      blockProp: 'link',
      targetAssetId: ASSET_ID,
      targetBlockId: null,
      targetAnchor: null,
      type: 'mention',
    },
  ]);
});

test('does not extract links from asset prop value with invalid id', () => {
  expect(
    extractAssetLinksFromProps({
      link: { AssetId: 'not-a-uuid', Title: 'Bad', Name: null },
    }),
  ).toEqual([]);
});

test('extracts nothing when extract_formulas is set', () => {
  expect(
    extractAssetLinksFromProps(
      {
        value: `[[asset:${ASSET_ID}|Воин]]`,
        link: { AssetId: ASSET_ID, Title: 'Воин', Name: null },
      },
      true,
    ),
  ).toEqual([]);
});
