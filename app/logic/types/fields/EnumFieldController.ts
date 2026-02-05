import { FieldTypeController } from '../FieldTypeController';
import EnumPropEditor from '../../../components/Props/EnumPropEditor.vue';
import EnumPropPresenter from '../../../components/Props/EnumPropPresenter.vue';
import { ASSET_VALUE_ENUM } from '../../constants';
import { AssetPropType } from '../Props';

export class EnumFieldController extends FieldTypeController {
  name = 'enum';
  title = '[[t:Enum]]';
  editor = async () => EnumPropEditor;
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

  override dataTypes = [
    {
      Type: AssetPropType.ENUM,
    },
  ];
}
