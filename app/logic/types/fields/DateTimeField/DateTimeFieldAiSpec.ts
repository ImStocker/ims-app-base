import type { AiSpecEntry } from '#logic/types/AiSpec';

export const dateTimeFieldAiSpec: AiSpecEntry = {
  name: 'dateTime',
  title: '[[t:DateTimeField]]',
  aiSpec: {
    brief:
      'Date and time picker field for precise time-based data like timestamps, deadlines, and schedules.',
    spec: 'Value is stored as AssetPropValueTimestamp with Ts (Unix timestamp in seconds) and Str (ISO 8601 string).\n\nExample:\n{ "Ts": 1700000000, "Str": "2023-11-14T22:13:20.000Z" }',
    needSpec: true,
  },
};
