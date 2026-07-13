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

  override aiSpec =
    'Single-selection enum field. Value is stored as AssetPropValueEnum with `Enum` (enum type name), `Name` (key), and `Title` (display name). ' +
    'Use when a property must be chosen from a predefined set of options (e.g. difficulty level, character class, item category). ' +
    'Parameters: `type` (gddElementSelector — selects which enum definition to use), `nullable` (checkbox — allows empty/unset value).';
  override dataTypes = [
    {
      Type: AssetPropType.ENUM,
    },
  ];
}
