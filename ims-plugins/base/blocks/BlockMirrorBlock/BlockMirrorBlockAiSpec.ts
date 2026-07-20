import type { AiSpecEntry } from '#logic/types/AiSpec';

export const blockMirrorBlockAiSpec: AiSpecEntry = {
  name: 'block-mirror',
  icon: 'ims-icon-font-block-link',
  aiSpec: {
    brief:
      'Read-only copy of a block from another asset. Use to reuse content across assets without duplication.',
    spec: 'Structure:\n- `asset` — AssetPropValueAsset: target asset reference with `AssetId` (UUID), `Title`, and `Name`\n- `block_ref` — string: target block identifier, either `{blockName}` or `@` + `{blockId}` (e.g. "stats" or "@4cccae9d-...")\n\nExample:\n{\n  "asset": { "AssetId": "0e7c6606-6003-4942-8baf-9e230bc5572c", "Title": "Player Character", "Name": null },\n  "block_ref": "@4cccae9d-5b1f-424d-8d58-89e97d8529f8"\n}',
    needSpec: true,
  },
};
