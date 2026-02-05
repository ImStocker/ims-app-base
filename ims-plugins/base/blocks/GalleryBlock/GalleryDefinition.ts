import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class GalleryDefinition extends BlockTypeDefinition {
  name = 'gallery';
  component = async () => (await import('./GalleryBlock.vue')).default;
  icon = 'gallery-fill';
}
