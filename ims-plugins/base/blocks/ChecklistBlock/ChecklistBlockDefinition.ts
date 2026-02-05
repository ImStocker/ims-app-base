import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class ChecklistBlockDefinition extends BlockTypeDefinition {
  name = 'checklist';
  component = async () => (await import('./ChecklistBlock.vue')).default;
  icon = 'list-check';
}
