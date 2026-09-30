import type { AiSpecEntry } from '#logic/types/AiSpec';

export const assetListBlockAiSpec: AiSpecEntry = {
  name: 'assetList',
  icon: 'list-checks',
  aiSpec: {
    brief:
      'Ordered list of linked assets rendered as visual slots (icon + name), drag-reorderable. Use to reference other elements inline (cast of characters, level layout, item set, related documents).',
    spec: 'NOTE ON INHERITED FIELDS: `__type` and `__condition` may already be provided by a parent type (visible via getAsset on the parent type) — they restrict which assets can be added and are inherited automatically. Do NOT redefine them unless you intentionally override the restriction.\n\nEntries are stored as:\n- `value\\{index}` — one linked asset per slot, `index` is a 0-based contiguous integer and also defines the display order (AssetPropValueAsset | null). Renumber entries sequentially without gaps.\n- `__type` — optional asset type restriction (AssetPropValueAsset | null). Only assets of this type can be added to the list.\n- `__condition` — optional selection/condition filter (AssetPropValueSelection | null). Further restricts which assets can be added.\n\nAssetPropValueAsset shape: `{ "AssetId": "<uuid>", "Title": "Iron Sword", "Name": "iron_sword" }` (an `Icon` field may also be present).\n\nExample (cast list restricted to characters):\n{\n  "value\\\\0": { "AssetId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Title": "Aria", "Name": "aria" },\n  "value\\\\1": { "AssetId": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "Title": "Boran", "Name": "boran" },\n  "value\\\\2": null,\n  "__type": { "AssetId": "c3d4e5f6-a7b8-9012-cdef-123456789012", "Title": "Character", "Name": "character" },\n  "__condition": null\n}\n\nTo remove an entry, delete its `value\\{index}` key AND renumber all following entries so the indexes stay contiguous.\n\nThe block `name` is the service name of the list itself (used by formulas/expressions); keep it short and unique, e.g. `cast`, `levels`.',
    needSpec: true,
  },
};
