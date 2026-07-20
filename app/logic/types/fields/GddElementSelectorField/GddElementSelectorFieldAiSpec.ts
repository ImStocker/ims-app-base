import type { AiSpecEntry } from '#logic/types/AiSpec';

export const gddElementSelectorFieldAiSpec: AiSpecEntry = {
  name: 'gddElementSelector',
  title: '[[t:GddElementSelectorField]]',
  aiSpec: {
    brief:
      'GDD element selector for linking a property to a specific type of GDD element (character, item, location, quest).',
    spec: 'Value is stored as AssetPropValueAsset.\n\nExample:\n{ "AssetId": "a1b2c3d4-...", "Title": "Iron Sword", "Name": "iron_sword" }\n\nParameter:\n- type (gddElementSelector) — filters which element types are shown in the picker',
    needSpec: true,
  },
};
