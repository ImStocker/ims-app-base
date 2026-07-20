import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import { collectionBlockAiSpec } from './CollectionBlockAiSpec';

export class CollectionBlockDefinition extends BlockTypeDefinition {
  name = 'collection';
  component = async () => (await import('./CollectionBlock.vue')).default;
  icon = 'table-fill';
  override hideInAdding = true;
  override aiSpec = collectionBlockAiSpec.aiSpec;
}
