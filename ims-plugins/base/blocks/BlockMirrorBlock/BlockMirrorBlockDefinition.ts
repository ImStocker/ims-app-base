import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class BlockMirrorBlockDefinition extends BlockTypeDefinition {
  name = 'block-mirror';
  component = async () => (await import('./BlockMirrorBlock.vue')).default;
  icon = 'ims-icon-font-block-link';
  override hideInAdding = true;
  override aiSpec =
    'BlockMirrorBlock renders a read-only copy of a block from another asset inline. ' +
    'Use when the same content needs to appear in multiple places without duplication — ' +
    'e.g. reusing a character stats table across multiple scenes, or displaying a shared lore entry in different documents. ' +
    'The mirrored block stays in sync with the source automatically.\n\n' +
    'Structure:\n' +
    '- `asset` — AssetPropValueAsset: target asset reference with `AssetId` (UUID), `Title`, and `Name`\n' +
    '- `block_ref` — string: target block identifier, either `{blockName}` or `@` + `{blockId}` (e.g. `"stats"` or `"@4cccae9d-..."`)\n\n' +
    'Example:\n' +
    '{\n' +
    '  "asset": { "AssetId": "0e7c6606-6003-4942-8baf-9e230bc5572c", "Title": "Player Character", "Name": null },\n' +
    '  "block_ref": "@4cccae9d-5b1f-424d-8d58-89e97d8529f8"\n' +
    '}';
}
