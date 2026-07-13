import {
  FieldTypeController,
  type FieldTypeControllerParameter,
} from '../FieldTypeController';
import GddElementSelectorPropEditor from '../../../components/Props/GddElementSelectorPropEditor.vue';
import AssetLinkPropPresenter from '../../../components/Props/AssetLinkPropPresenter.vue';
import { AssetPropType } from '../Props';

export class GddElementSelectorFieldController extends FieldTypeController {
  name = 'gddElementSelector';
  title = '[[t:GddElementSelectorField]]';
  editor = async () => GddElementSelectorPropEditor;
  presenter = async () => AssetLinkPropPresenter;

  override parameters: FieldTypeControllerParameter[] = [
    {
      name: 'type',
      multiple: false,
      title: '[[t:ElementType]]',
      type: 'gddElementSelector',
      params: {},
      hint: '[[t:GddElementSelectorField_TypeParameter_Hint]]',
    },
  ];

  override aiSpec =
    'GDD element selector — references an asset filtered by a specific element type. ' +
    'Value is stored as AssetPropValueAsset. ' +
    'Use to link a property to a specific type of GDD element (e.g. a character, item, location, quest). ' +
    'Parameter `type` filters which element types are shown in the picker.';
  override dataTypes = [
    {
      Type: AssetPropType.ASSET,
    },
  ];
}
