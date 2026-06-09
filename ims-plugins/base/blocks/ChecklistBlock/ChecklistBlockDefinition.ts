import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class ChecklistBlockDefinition extends BlockTypeDefinition {
  name = 'checklist';
  component = async () => (await import('./ChecklistBlock.vue')).default;
  icon = 'list-check';
  override aiSpec =
    'This block stores a checklist as flat props keyed by item key (UUID or MD5 hash of title). Each item stored as: `{key}\\title` (AssetPropValue — text or string), `{key}\\checked` (boolean), `{key}\\task` (AssetPropValueAsset | null — linked task: {AssetId, Title, Name}), `{key}\\inherited` (boolean), `{key}\\index` (number). Items can be checked/unchecked, renamed inline, reordered via drag-and-drop, and split from clipboard text.';
}
