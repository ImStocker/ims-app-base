import type { AiSpecEntry } from '#logic/types/AiSpec';

export const enumRadioFieldAiSpec: AiSpecEntry = {
  name: 'enumRadio',
  title: '[[t:EnumRadio]]',
  aiSpec: {
    brief:
      'Enum field displayed as radio buttons for quick visual selection of a predefined option.',
    spec: 'Value is stored as AssetPropValueEnum, same as enum field.\n\nExample:\n{ "Enum": "game_difficulty", "Name": "hard", "Title": "Hard" }\n\nBest for enums with few options (2-5).\n\nParameters:\n- type (gddElementSelector) — selects which enum definition to use\n- nullable (checkbox) — allows empty/unset value',
    needSpec: true,
  },
};
