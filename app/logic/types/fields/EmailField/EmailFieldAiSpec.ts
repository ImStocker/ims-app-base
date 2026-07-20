import type { AiSpecEntry } from '#logic/types/AiSpec';

export const emailFieldAiSpec: AiSpecEntry = {
  name: 'email',
  title: '[[t:EmailField]]',
  aiSpec: {
    brief:
      'Email address field with built-in validation for contact and account emails.',
  },
};
