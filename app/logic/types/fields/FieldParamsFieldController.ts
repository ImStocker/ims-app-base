import { FieldTypeController } from '../FieldTypeController';
import FieldParamsEditor from '../../../components/Props/FieldParamsEditor.vue';

export class FieldParamsFieldController extends FieldTypeController {
  name = 'fieldParams';
  title = '[[t:FieldParamsField]]';
  override aiSpec =
    'Field parameters editor — internal field type for editing field controller parameters within the PropsBlock settings panel. ' +
    'Not intended for direct data entry. Used automatically when configuring a property\'s field type parameters.';
  editor = async () => FieldParamsEditor;
  presenter = async () => FieldParamsEditor;
}
