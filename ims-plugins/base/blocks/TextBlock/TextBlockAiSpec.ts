import type { AiSpecEntry } from '#logic/types/AiSpec';

export const textBlockAiSpec: AiSpecEntry = {
  name: 'text',
  icon: 'font-family',
  aiSpec: {
    brief:
      'Single rich text or plain text value. Use for descriptions, notes, articles, dialogues, or any formatted text.',
    spec: 'TextBlock stores a single rich text or plain text value. Use it for any textual content: descriptions, notes, articles, dialogues, or any formatted text. The block supports all Quill Delta formatting (bold, italic, headers, lists, links, colors, etc.).\n\nThe value is stored in the `value` prop and can be in two forms:\n- A plain string (simple unformatted text)\n- An AssetPropValueText object with `Str` (plain text rendering) and `Ops` (Quill Delta operations for rich formatting)\nWhen read, plain strings are auto-converted to Delta format. ',
    needSpec: true,
  },
};
