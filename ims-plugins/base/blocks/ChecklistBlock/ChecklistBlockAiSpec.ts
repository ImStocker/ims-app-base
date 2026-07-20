import type { AiSpecEntry } from '#logic/types/AiSpec';

export const checklistBlockAiSpec: AiSpecEntry = {
  name: 'checklist',
  icon: 'list-check',
  aiSpec: {
    brief:
      'List of checkable items with optional task linking. Use for to-do lists, feature checklists, bug tracking, or milestone requirements.',
    spec: 'Each item is keyed by a UUID or MD5 hash of its title and stored as:\n- `{key}\\title` — item text (string or AssetPropValueText for rich formatting)\n- `{key}\\checked` — boolean: whether the item is checked off\n- `{key}\\task` — AssetPropValueAsset | null: linked task asset reference `{AssetId, Title, Name}`\n- `{key}\\index` — sort order (number)\n\nExample (milestone checklist):\n{\n  "a1b2c3d4-...\\\\title": "Implement combat system",\n  "a1b2c3d4-...\\\\checked": true,\n  "a1b2c3d4-...\\\\index": 1,\n  "e5f6g7h8-...\\\\title": "Design boss AI",\n  "e5f6g7h8-...\\\\checked": false,\n  "e5f6g7h8-...\\\\task": { "AssetId": "task-uuid-123", "Title": "Boss AI Design", "Name": "" },\n  "e5f6g7h8-...\\\\index": 2,\n  "i9j0k1l2-...\\\\title": "Polishing animations",\n  "i9j0k1l2-...\\\\checked": false,\n  "i9j0k1l2-...\\\\index": 3\n}',
    needSpec: true,
  },
};
