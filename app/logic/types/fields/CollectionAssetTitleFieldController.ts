import { FieldTypeController } from '../FieldTypeController';
import CollectionAssetTitlePropEditor from '../../../components/Props/CollectionAssetTitlePropEditor.vue';
import CollectionAssetTitlePropPresenter from '../../../components/Props/CollectionAssetTitlePropPresenter.vue';
import { AssetPropType } from '../Props';

export class CollectionAssetTitleController extends FieldTypeController {
  name = 'collectionAssetTitle';
  title = '[[t:CollectionAssetTitle]]';
  editor = async () => CollectionAssetTitlePropEditor;
  presenter = async () => CollectionAssetTitlePropPresenter;

  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
