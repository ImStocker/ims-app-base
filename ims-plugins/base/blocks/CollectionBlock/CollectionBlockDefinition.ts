import { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';

export class CollectionBlockDefinition extends BlockTypeDefinition {
  name = 'collection';
  component = async () => (await import('./CollectionBlock.vue')).default;
  icon = 'table-fill';
  override hideInAdding = true;
  override aiSpec =
    'This block renders an inline workspace table inside an asset. No block-local props — it reads the parent asset\'s workspaceId to query assets from that workspace. Uses workspace props\' `views` (dictionary of UserView objects): each view has filter (AssetPropWhere), sort (AssetPropsSelectionOrder[]), props (AssetPropsSelectionField[]), type (string), title (string), index (number). Displays a sortable/filterable table with user-configurable views. System-internal (hideInAdding=true), auto-created per workspace context.';
}
