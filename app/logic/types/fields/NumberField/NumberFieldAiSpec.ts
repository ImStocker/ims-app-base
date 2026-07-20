import type { AiSpecEntry } from '#logic/types/AiSpec';

export const numberFieldAiSpec: AiSpecEntry = {
  name: 'number',
  title: '[[t:NumberField]]',
  aiSpec: {
    brief:
      'Floating-point number field for decimal values like percentages, measurements, and coordinates.',
  },
};
