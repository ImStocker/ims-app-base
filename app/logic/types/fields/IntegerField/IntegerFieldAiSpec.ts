import type { AiSpecEntry } from '#logic/types/AiSpec';

export const integerFieldAiSpec: AiSpecEntry = {
  name: 'integer',
  title: '[[t:IntegerField]]',
  aiSpec: {
    brief:
      'Whole number (integer) field for numeric values like counters, quantities, levels, and IDs.',
  },
};
