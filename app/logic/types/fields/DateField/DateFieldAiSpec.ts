import type { AiSpecEntry } from '#logic/types/AiSpec';

export const dateFieldAiSpec: AiSpecEntry = {
  name: 'date',
  title: '[[t:DateField]]',
  aiSpec: {
    brief:
      'Date-only picker field for calendar dates without time (e.g. birth date, release date).',
  },
};
