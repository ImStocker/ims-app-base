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

  override dataTypes = [
    {
      Type: AssetPropType.ASSET,
    },
  ];
}
