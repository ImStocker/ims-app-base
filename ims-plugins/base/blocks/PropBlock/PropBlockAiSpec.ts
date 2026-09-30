import type { AiSpecEntry } from '#logic/types/AiSpec';

export const propBlockAiSpec: AiSpecEntry = {
  name: 'prop',
  icon: 'tag',
  aiSpec: {
    brief:
      'Single named variable — a titled value with its own field type. Use for one scalar value per row (health, cost, rarity, quest stage) instead of a whole properties table.',
    spec: 'NOTE ON INHERITED FIELDS: the field definition (`__type`, `__multiple`, `__params\\...`, `__hint`) may already be provided by a parent type (visible via getAsset on the parent type) and is inherited automatically. Do NOT redefine those keys unless you intentionally override the inherited definition; just set `value`.\n\nStored as:\n- `value` — the value itself (AssetPropValue; shape depends on `__type`; see the "Field type controllers reference" section)\n- `__type` — field type controller name (string | null, e.g. `text`, `string`, `integer`, `number`, `enum`, `checkbox`, `assetSelector`, `dateTime`). Determines how the value is edited and presented. Defaults to `text`.\n- `__multiple` — if true, the value is stored as an array with numeric sub-keys (boolean)\n- `__params\\{paramName}` — controller-specific sub-fields (object), only for types that declare parameters\n- `__hint` — optional hint/description shown next to the field (string)\n\nThe block `title` is the display label of the variable; the block `name` is its service name (used by formulas/expressions and by parent types that expose this variable). Keep the name short, lowercase and unique, e.g. `max_health`, `difficulty`. Omit `__type`/`__multiple`/`__params`/`__hint` entirely when not needed.\n\nExample (integer variable):\n{\n  "value": 100,\n  "__type": "integer",\n  "__hint": "Hit points before death"\n}\n\nExample (enum variable):\n{\n  "value": { "Enum": "game_difficulty", "Name": "hard", "Title": "Hard" },\n  "__type": "enum"\n}\n\nExample (multiple variable — values stored as `value\\{index}`, 0-based and contiguous):\n{\n  "value\\\\0": "fire",\n  "value\\\\1": "frost",\n  "__type": "string",\n  "__multiple": true\n}',
    needSpec: true,
  },
};
