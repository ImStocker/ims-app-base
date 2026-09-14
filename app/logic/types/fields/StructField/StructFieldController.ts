import { FieldTypeController } from '../../FieldTypeController';
import { structFieldAiSpec } from './StructFieldAiSpec';
import StructFieldValueEditor from '../../../../components/Props/StructFieldValueEditor.vue';
import { ASSET_VALUE_STRUCTURE } from '../../../constants';

export class StructFieldController extends FieldTypeController {
  name = 'struct';
  title = '[[t:Structure]]';
  editor = async () => StructFieldValueEditor;
  presenter = async () => StructFieldValueEditor;

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
