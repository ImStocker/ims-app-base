import type { AiSpecEntry } from '#logic/types/AiSpec';

export const collectionBlockAiSpec: AiSpecEntry = {
  name: 'collection',
  icon: 'table-fill',
  aiSpec: {
    brief:
      'Inline workspace table showing filtered child assets. System-internal block, auto-created per workspace context.',
  },
};
