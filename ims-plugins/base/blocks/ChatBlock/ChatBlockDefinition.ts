import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import { chatBlockAiSpec } from './ChatBlockAiSpec';

export class ChatBlockDefinition extends BlockTypeDefinition {
  name = 'chat';
  component = async () => (await import('./ChatBlock.vue')).default;
  icon = '';
  override hideInAdding = true;
  override aiSpec = chatBlockAiSpec.aiSpec;
}
