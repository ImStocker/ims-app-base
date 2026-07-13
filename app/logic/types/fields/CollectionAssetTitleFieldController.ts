import { FieldTypeController } from '../FieldTypeController';
import CollectionAssetTitlePropEditor from '../../../components/Props/CollectionAssetTitlePropEditor.vue';
import CollectionAssetTitlePropPresenter from '../../../components/Props/CollectionAssetTitlePropPresenter.vue';
import { AssetPropType } from '../Props';

export class CollectionAssetTitleController extends FieldTypeController {
  name = 'collectionAssetTitle';
  title = '[[t:CollectionAssetTitle]]';
  editor = async () => CollectionAssetTitlePropEditor;
  presenter = async () => CollectionAssetTitlePropPresenter;

  override aiSpec =
    'Collection asset title field. Value is stored as a string. ' +
    'Use for displaying and editing the title of an asset within a collection context. ' +
    'Typically bound to the asset\'s own title property for inline editing in collection views.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
