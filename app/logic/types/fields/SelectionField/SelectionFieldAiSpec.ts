import type { AiSpecEntry } from '#logic/types/AiSpec';

export const selectionFieldAiSpec: AiSpecEntry = {
  name: 'selection',
  title: '[[t:SelectionField]]',
  aiSpec: {
    brief:
      'Selection / filter expression for restricting which assets are available in an element selector or asset list.',
    spec: 'Value is stored as AssetPropValueSelection with the source expression text and its compiled WHERE condition.\n\nExample:\n{ "Str": "status = done", "Where": { "status": "done" } }\n\nUsed as a parameter (condition) of element selector and asset list blocks.',
    needSpec: true,
  },
};
