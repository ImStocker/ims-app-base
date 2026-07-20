import { FieldTypeController } from '../../FieldTypeController';
import CollectionAssetTitlePropEditor from '../../../../components/Props/CollectionAssetTitlePropEditor.vue';
import CollectionAssetTitlePropPresenter from '../../../../components/Props/CollectionAssetTitlePropPresenter.vue';
import { AssetPropType } from '../../Props';
import { collectionAssetTitleFieldAiSpec } from './CollectionAssetTitleFieldAiSpec';

export class CollectionAssetTitleController extends FieldTypeController {
  name = 'collectionAssetTitle';
  title = '[[t:CollectionAssetTitle]]';
  editor = async () => CollectionAssetTitlePropEditor;
  presenter = async () => CollectionAssetTitlePropPresenter;

  override aiSpec = collectionAssetTitleFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
