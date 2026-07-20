import type { AiSpecEntry } from '#logic/types/AiSpec';

export const stringFieldAiSpec: AiSpecEntry = {
  name: 'string',
  title: '[[t:StringField]]',
  aiSpec: {
    brief:
      'Single-line plain text field for short text inputs like names, titles, labels, and codes.',
  },
};
