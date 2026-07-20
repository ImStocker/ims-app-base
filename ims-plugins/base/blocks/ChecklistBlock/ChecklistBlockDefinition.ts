import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import { checklistBlockAiSpec } from './ChecklistBlockAiSpec';

export class ChecklistBlockDefinition extends BlockTypeDefinition {
  name = 'checklist';
  component = async () => (await import('./ChecklistBlock.vue')).default;
  icon = 'list-check';
  override aiSpec = checklistBlockAiSpec.aiSpec;
}
