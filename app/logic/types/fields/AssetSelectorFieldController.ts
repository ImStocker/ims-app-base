import { FieldTypeController } from '../FieldTypeController';
import AssetSelectorPropEditor from '../../../components/Props/AssetSelectorPropEditor.vue';
import AssetLinkPropPresenter from '../../../components/Props/AssetLinkPropPresenter.vue';
import { AssetPropType } from '../Props';

export class AssetSelectorFieldController extends FieldTypeController {
  name = 'assetSelector';
  title = '[[t:AssetSelectorField]]';
  editor = async () => AssetSelectorPropEditor;
  presenter = async () => AssetLinkPropPresenter;
  override dataTypes = [
    {
      Type: AssetPropType.ASSET,
    },
  ];
}
