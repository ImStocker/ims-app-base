import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class CollectionBlockDefinition extends BlockTypeDefinition {
  name = 'collection';
  component = async () => (await import('./CollectionBlock.vue')).default;
  icon = 'table-fill';
  override hideInAdding = true;
}
