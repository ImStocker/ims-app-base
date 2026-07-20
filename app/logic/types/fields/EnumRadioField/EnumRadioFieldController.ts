import { FieldTypeController } from '../../FieldTypeController';
import EnumRadioPropEditor from '../../../../components/Props/EnumRadioPropEditor.vue';
import { ASSET_VALUE_ENUM } from '../../../constants';
import { AssetPropType } from '../../Props';
import EnumPropPresenter from '#components/Props/EnumPropPresenter.vue';
import { enumRadioFieldAiSpec } from './EnumRadioFieldAiSpec';

export class EnumRadioFieldController extends FieldTypeController {
  name = 'enumRadio';
  title = '[[t:EnumRadio]]';
  editor = async () => EnumRadioPropEditor;
  presenter = async () => EnumPropPresenter;
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

  override aiSpec = enumRadioFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.ENUM,
    },
  ];
}
