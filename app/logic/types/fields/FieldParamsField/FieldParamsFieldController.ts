import { FieldTypeController } from '../../FieldTypeController';
import FieldParamsEditor from '../../../../components/Props/FieldParamsEditor.vue';
import { fieldParamsFieldAiSpec } from './FieldParamsFieldAiSpec';

export class FieldParamsFieldController extends FieldTypeController {
  name = 'fieldParams';
  title = '[[t:FieldParamsField]]';
  override aiSpec = fieldParamsFieldAiSpec.aiSpec;
  editor = async () => FieldParamsEditor;
  presenter = async () => FieldParamsEditor;
}
