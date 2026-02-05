import { FieldTypeController } from '../FieldTypeController';
import EnumRadioPropEditor from '../../../components/Props/EnumRadioPropEditor.vue';
import CaptionPropPresenter from '../../../components/Props/CaptionPropPresenter.vue';
import { ASSET_VALUE_ENUM } from '../../constants';
import { AssetPropType } from '../Props';

export class EnumRadioFieldController extends FieldTypeController {
  name = 'enumRadio';
  title = '[[t:EnumRadio]]';
  editor = async () => EnumRadioPropEditor;
  presenter = async () => CaptionPropPresenter;
  override parameters = [
    {
      name: 'type',
      multiple: false,
      title: '[[t:EnumType]]',
      type: 'gddElementSelector',
      params: {
        type: ASSET_VALUE_ENUM,
      },
    },
    {
      name: 'nullable',
      multiple: false,
      title: '[[t:Nullable]]',
      type: 'checkbox',
      params: {
        default: true,
      } as any,
    },
  ];

  override dataTypes = [
    {
      Type: AssetPropType.ENUM,
    },
  ];
}
