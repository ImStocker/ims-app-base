import type { AiSpecEntry } from '#logic/types/AiSpec';

export const embedBlockAiSpec: AiSpecEntry = {
  name: 'embed',
  icon: 'external-link-fill',
  aiSpec: {
    brief:
      'External embedded content (Figma, Google Docs/Sheets/Slides, YouTube, Miro). Renders an iframe for recognized services or a clickable link otherwise.',
  },
};
