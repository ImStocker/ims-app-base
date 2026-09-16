import { AssetChangeBatch } from './AssetChangeBatch';

const BLOCK_ID = 'a98a740e-94c0-449a-bea8-f033a45000d5';
const BLOCK_REF = `@${BLOCK_ID}`;

test('create + rename by name merges into a single block entry', () => {
  const batch = new AssetChangeBatch();
  batch.addChange({
    blocks: {
      [BLOCK_REF]: {
        type: 'prop',
        name: 'property',
        title: 'Property',
        index: 6.1789574778377,
        props: { value: null, __type: null },
      },
    },
  });
  batch.addChange({
    blocks: {
      property: {
        name: 'armor',
        title: 'Armor',
      },
    },
  });

  expect(batch.getBatch()).toEqual([
    {
      blocks: {
        [BLOCK_REF]: {
          index: 6.1789574778377,
          name: 'armor',
          title: 'Armor',
          type: 'prop',
          props: { value: null, __type: null },
        },
      },
    },
  ]);
});

test('create + rename + subsequent change by new name stays merged', () => {
  const batch = new AssetChangeBatch();
  batch.addChange({
    blocks: {
      [BLOCK_REF]: {
        type: 'prop',
        name: 'property',
        title: 'Property',
      },
    },
  });
  batch.addChange({
    blocks: {
      property: { name: 'armor' },
    },
  });
  batch.addChange({
    blocks: {
      armor: { title: 'Armor' },
    },
  });

  expect(batch.getBatch()).toEqual([
    {
      blocks: {
        [BLOCK_REF]: {
          name: 'armor',
          title: 'Armor',
          type: 'prop',
        },
      },
    },
  ]);
});

test('existing block rename keeps the original ref as key', () => {
  const batch = new AssetChangeBatch();
  batch.addChange({
    blocks: {
      property: { name: 'armor', title: 'Armor' },
    },
  });
  batch.addChange({
    blocks: {
      armor: { title: 'Armor 2' },
    },
  });

  expect(batch.getBatch()).toEqual([
    {
      blocks: {
        property: {
          name: 'armor',
          title: 'Armor 2',
        },
      },
    },
  ]);
});

test('create then delete by name removes the block entirely', () => {
  const batch = new AssetChangeBatch();
  batch.addChange({
    blocks: {
      [BLOCK_REF]: {
        type: 'prop',
        name: 'property',
        title: 'Property',
      },
    },
  });
  batch.addChange({
    blocks: {
      property: { delete: true },
    },
  });

  expect(batch.getBatch()).toEqual([]);
});
