import { FieldTypeController } from '../FieldTypeController';
import StructPropEditor from '../../../components/Props/StructPropEditor.vue';
import { ASSET_VALUE_STRUCTURE } from '../../constants';

export class StructFieldController extends FieldTypeController {
  name = 'struct';
  title = '[[t:Structure]]';
  editor = async () => StructPropEditor;
  presenter = async () => StructPropEditor;

  override aiSpec =
    'Structured sub-object field. Value is stored as a nested AssetProps object following a structure definition. ' +
    'Use when a property requires multiple related sub-fields (e.g. an address with city/street/zip, or a skill with name/level/cooldown). ' +
    'Parameter `type` (gddElementSelector) selects which structure template to use for the sub-fields.';
  override parameters = [
    {
      name: 'type',
      multiple: false,
      title: '[[t:StructureType]]',
      type: 'gddElementSelector',
      params: {
        type: ASSET_VALUE_STRUCTURE,
      },
    },
  ];
}
