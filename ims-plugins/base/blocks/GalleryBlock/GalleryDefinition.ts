import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class GalleryDefinition extends BlockTypeDefinition {
  name = 'gallery';
  component = async () => (await import('./GalleryBlock.vue')).default;
  icon = 'gallery-fill';
  override aiSpec =
    'This block stores a media gallery as a flat set of props keyed by item key. Each item is stored as composite keys: `{key}\\type` (string: "file"|"youtube"|"extimage"|"extvideo"|"rutube"|"vkvideo"), `{key}\\value` (AssetPropValue: for type "file" -> AssetPropValueFile {FileId, Title, Size, Dir, Store}, for other types -> string URL), `{key}\\inherited` (boolean), `{key}\\index` (number). Items are sortable, draggable, support file upload, clipboard paste, and external link entry.';
}
