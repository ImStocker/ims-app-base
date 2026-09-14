import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class CommentBlockDefinition extends BlockTypeDefinition {
  name = 'comment';
  component = async () => (await import('./CommentBlock.vue')).default;
  icon = 'ri-chat-3-line';
  override group = 'other';
  override index = 32;
  override hideBlockHeader = true;

  override aiSpec = {
    brief:
      'Inline text comment stored directly on the asset under the __comment property. Not a DSL variable, not localizable.',
  };
}
