import { FieldTypeController } from '../../FieldTypeController';
import AssetSelectorPropEditor from '../../../../components/Props/AssetSelectorPropEditor.vue';
import AssetLinkPropPresenter from '../../../../components/Props/AssetLinkPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { assetSelectorFieldAiSpec } from './AssetSelectorFieldAiSpec';

export class AssetSelectorFieldController extends FieldTypeController {
  name = 'assetSelector';
  title = '[[t:AssetSelectorField]]';
  editor = async () => AssetSelectorPropEditor;
  presenter = async () => AssetLinkPropPresenter;
  override aiSpec = assetSelectorFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.ASSET,
    },
  ];
}
