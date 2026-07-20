import type { AiSpecEntry } from '#logic/types/AiSpec';

export const structFieldAiSpec: AiSpecEntry = {
  name: 'struct',
  title: '[[t:Structure]]',
  aiSpec: {
    brief:
      'Structured sub-object field for grouping multiple related sub-fields under one property.',
    spec: 'Value is stored as a nested AssetProps object following a structure definition.\n\nExample (address structure):\n{ "City": "Moscow", "Street": "Tverskaya", "Zip": "125009" }\n\nParameter:\n- type (gddElementSelector) — selects which structure template to use for the sub-fields',
    needSpec: true,
  },
};
