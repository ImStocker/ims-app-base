import { FieldTypeController } from '../FieldTypeController';
import FieldParamsEditor from '../../../components/Props/FieldParamsEditor.vue';

export class FieldParamsFieldController extends FieldTypeController {
  name = 'fieldParams';
  title = '[[t:FieldParamsField]]';
  editor = async () => FieldParamsEditor;
  presenter = async () => FieldParamsEditor;
}
