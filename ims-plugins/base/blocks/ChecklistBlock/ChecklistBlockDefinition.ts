import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class ChecklistBlockDefinition extends BlockTypeDefinition {
  name = 'checklist';
  component = async () => (await import('./ChecklistBlock.vue')).default;
  icon = 'list-check';
  override aiSpec =
    'ChecklistBlock stores a list of checkable items with optional linked tasks. ' +
    'Use for to-do lists, feature checklists, bug tracking, milestone requirements, or any set of items to track as done/pending. ' +
    'Items support inline rename, drag-and-drop reorder, check/uncheck, and split from clipboard text.\n\n' +
    'Each item is keyed by a UUID or MD5 hash of its title and stored as:\n' +
    '- `{key}\\title` — item text (string or AssetPropValueText for rich formatting)\n' +
    '- `{key}\\checked` — boolean: whether the item is checked off\n' +
    '- `{key}\\task` — AssetPropValueAsset | null: linked task asset reference `{AssetId, Title, Name}`\n' +
    '- `{key}\\index` — sort order (number)\n\n' +
    'Example (milestone checklist):\n' +
    '{\n' +
    '  "a1b2c3d4-...\\\\title": "Implement combat system",\n' +
    '  "a1b2c3d4-...\\\\checked": true,\n' +
    '  "a1b2c3d4-...\\\\index": 1,\n' +
    '  "e5f6g7h8-...\\\\title": "Design boss AI",\n' +
    '  "e5f6g7h8-...\\\\checked": false,\n' +
    '  "e5f6g7h8-...\\\\task": { "AssetId": "task-uuid-123", "Title": "Boss AI Design", "Name": "" },\n' +
    '  "e5f6g7h8-...\\\\index": 2,\n' +
    '  "i9j0k1l2-...\\\\title": "Polishing animations",\n' +
    '  "i9j0k1l2-...\\\\checked": false,\n' +
    '  "i9j0k1l2-...\\\\index": 3\n' +
    '}';
}
