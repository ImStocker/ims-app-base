import type { AiSpecEntry } from '#logic/types/AiSpec';

export const buttonDateTimeFieldAiSpec: AiSpecEntry = {
  name: 'buttonDateTime',
  title: '[[t:ButtonDateTimeField]]',
  aiSpec: {
    brief:
      'Button-triggered date/time stamp field for single-click actions like "Mark as published" or "Approve".',
    spec: 'Value is stored as AssetPropValueTimestamp.\n\nUnlike dateTime which shows a continuous picker, this displays a button that sets the timestamp on click.\n\nParameters:\n- caption (string) — button label\n- confirm (checkbox) — require confirmation before setting',
    needSpec: true,
  },
};
