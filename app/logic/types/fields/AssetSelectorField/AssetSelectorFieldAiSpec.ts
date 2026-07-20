import type { AiSpecEntry } from '#logic/types/AiSpec';

export const assetSelectorFieldAiSpec: AiSpecEntry = {
  name: 'assetSelector',
  title: '[[t:AssetSelectorField]]',
  aiSpec: {
    brief:
      'Asset reference selector for creating links between assets (icons, characters, locations, etc.).',
    spec: 'Value is stored as AssetPropValueAsset with AssetId (UUID), Title, and Name.\n\nExample:\n{ "AssetId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Title": "Iron Sword", "Name": "iron_sword" }',
    needSpec: true,
  },
};
