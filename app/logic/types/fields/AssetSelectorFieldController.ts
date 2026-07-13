import { FieldTypeController } from '../FieldTypeController';
import AssetSelectorPropEditor from '../../../components/Props/AssetSelectorPropEditor.vue';
import AssetLinkPropPresenter from '../../../components/Props/AssetLinkPropPresenter.vue';
import { AssetPropType } from '../Props';

export class AssetSelectorFieldController extends FieldTypeController {
  name = 'assetSelector';
  title = '[[t:AssetSelectorField]]';
  editor = async () => AssetSelectorPropEditor;
  presenter = async () => AssetLinkPropPresenter;
  override aiSpec =
    'Asset reference selector. Value is stored as AssetPropValueAsset with `AssetId` (UUID), `Title`, and `Name`. ' +
    'Use to create links between assets — e.g. assign an icon, reference a character sheet, link a quest to a location. ' +
    'The editor provides a search dialog to find and select any asset in the project.';
  override dataTypes = [
    {
      Type: AssetPropType.ASSET,
    },
  ];
}
