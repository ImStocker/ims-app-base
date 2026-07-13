import { FieldTypeController } from '../FieldTypeController';
import EnumRadioPropEditor from '../../../components/Props/EnumRadioPropEditor.vue';
import { ASSET_VALUE_ENUM } from '../../constants';
import { AssetPropType } from '../Props';
import EnumPropPresenter from '#components/Props/EnumPropPresenter.vue';

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

  override aiSpec =
    'Enum field displayed as radio buttons instead of a dropdown. Value is stored as AssetPropValueEnum. ' +
    'Same as `enum` but uses a radio button UI for quick visual selection. Best for enums with few options (2-5). ' +
    'Parameters: `type` (gddElementSelector — selects which enum definition to use), `nullable` (checkbox).';
  override dataTypes = [
    {
      Type: AssetPropType.ENUM,
    },
  ];
}
