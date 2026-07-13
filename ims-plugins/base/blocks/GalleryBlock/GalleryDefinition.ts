import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class GalleryDefinition extends BlockTypeDefinition {
  name = 'gallery';
  component = async () => (await import('./GalleryBlock.vue')).default;
  icon = 'gallery-fill';
  override aiSpec =
    'GalleryBlock stores a collection of media items (images, videos) displayed as a gallery. ' +
    'Use for character portraits, concept art, screenshots, environment mockups, reference boards, or any visual media collection. ' +
    'Items support drag-and-drop reordering, file upload, clipboard paste, and external link entry.\n\n' +
    'Each item is keyed by a UUID and stored as:\n' +
    '- `{key}\\type` — media type string: "file" (uploaded file), "youtube", "extimage", "extvideo", "rutube", "vkvideo"\n' +
    '- `{key}\\value` — the media data. For type "file": AssetPropValueFile with `FileId`, `Title`, `Size`, `Dir`, `Store`. For external types: a string URL.\n' +
    '- `{key}\\index` — sort order (number)\n' +
    '- `{key}\\inherited` — whether the item is inherited from a parent (boolean, optional)\n\n' +
    'Example (character concept art gallery):\n' +
    '{\n' +
    '  "a1b2c3d4-...\\\\type": "file",\n' +
    '  "a1b2c3d4-...\\\\value": { "FileId": "a1b2c3d4-...", "Title": "hero_concept_front.png", "Size": 124567, "Dir": "concepts", "Store": "p-abc123" },\n' +
    '  "a1b2c3d4-...\\\\index": 1,\n' +
    '  "e5f6g7h8-...\\\\type": "file",\n' +
    '  "e5f6g7h8-...\\\\value": { "FileId": "e5f6g7h8-...", "Title": "hero_concept_back.png", "Size": 112345, "Dir": "concepts", "Store": "p-abc123" },\n' +
    '  "e5f6g7h8-...\\\\index": 2,\n' +
    '  "i9j0k1l2-...\\\\type": "youtube",\n' +
    '  "i9j0k1l2-...\\\\value": "https://www.youtube.com/watch?v=example",\n' +
    '  "i9j0k1l2-...\\\\index": 3\n' +
    '}';
}
