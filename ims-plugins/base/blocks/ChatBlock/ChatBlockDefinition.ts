import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class ChatBlockDefinition extends BlockTypeDefinition {
  name = 'chat';
  component = async () => (await import('./ChatBlock.vue')).default;
  icon = '';
  override hideInAdding = true;
}
