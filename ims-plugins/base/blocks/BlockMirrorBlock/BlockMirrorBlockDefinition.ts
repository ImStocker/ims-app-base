import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class BlockMirrorBlockDefinition extends BlockTypeDefinition {
  name = 'block-mirror';
  component = async () => (await import('./BlockMirrorBlock.vue')).default;
  icon = 'ims-icon-font-block-link';
  override hideInAdding = true;
  override aiSpec =
    'This block mirrors a block from another asset as read-only. Props: `asset` (AssetPropValueAsset: {AssetId, Title, Name} — target asset reference), `block_ref` (string — target block identifier, parsed as either {blockName} or {blockId}). The block fetches the target asset and renders the specified block\'s content inline. System-internal (hideInAdding=true), auto-created when a mirror relationship is needed.';
}
