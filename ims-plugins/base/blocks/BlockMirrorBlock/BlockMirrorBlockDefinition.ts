import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import { blockMirrorBlockAiSpec } from './BlockMirrorBlockAiSpec';

export class BlockMirrorBlockDefinition extends BlockTypeDefinition {
  name = 'block-mirror';
  component = async () => (await import('./BlockMirrorBlock.vue')).default;
  icon = 'ims-icon-font-block-link';
  override hideInAdding = true;
  override aiSpec = blockMirrorBlockAiSpec.aiSpec;
}
