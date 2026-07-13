import { FieldTypeController } from '../FieldTypeController';
import StringPropEditor from '../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class StringFieldController extends FieldTypeController {
  name = 'string';
  title = '[[t:StringField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;

  override aiSpec =
    'Single-line plain text field. Value is stored as a plain string. ' +
    'Use for short text inputs like names, titles, labels, codes, or any unformatted single-line content.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
