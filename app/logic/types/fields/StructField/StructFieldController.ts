import { FieldTypeController } from '../../FieldTypeController';
import { structFieldAiSpec } from './StructFieldAiSpec';
import StructPropEditor from '../../../../components/Props/StructPropEditor.vue';
import { ASSET_VALUE_STRUCTURE } from '../../../constants';

export class StructFieldController extends FieldTypeController {
  name = 'struct';
  title = '[[t:Structure]]';
  editor = async () => StructPropEditor;
  presenter = async () => StructPropEditor;

  override aiSpec = structFieldAiSpec.aiSpec;
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
