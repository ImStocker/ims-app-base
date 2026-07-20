import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import { galleryAiSpec } from './GalleryAiSpec';

export class GalleryDefinition extends BlockTypeDefinition {
  name = 'gallery';
  component = async () => (await import('./GalleryBlock.vue')).default;
  icon = 'gallery-fill';
  override aiSpec = galleryAiSpec.aiSpec;
}
