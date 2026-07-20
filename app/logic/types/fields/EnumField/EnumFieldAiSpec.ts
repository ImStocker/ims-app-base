import type { AiSpecEntry } from '#logic/types/AiSpec';

export const enumFieldAiSpec: AiSpecEntry = {
  name: 'enum',
  title: '[[t:Enum]]',
  aiSpec: {
    brief: 'Single-selection enum from a predefined set of options (dropdown).',
    spec: 'Value is stored as AssetPropValueEnum with Enum (enum type name), Name (key), and Title (display name).\n\nExample:\n{ "Enum": "game_difficulty", "Name": "hard", "Title": "Hard" }\n\nParameters:\n- type (gddElementSelector) — selects which enum definition to use\n- nullable (checkbox) — allows empty/unset value',
    needSpec: true,
  },
};
