import type { AiSpecEntry } from '#logic/types/AiSpec';

export const textCutFieldAiSpec: AiSpecEntry = {
  name: 'textCut',
  title: '[[t:TextField]]',
  aiSpec: {
    brief:
      'Rich text field with automatic truncation for preview/list view display.',
  },
};
