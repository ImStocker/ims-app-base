import { FieldTypeController } from '../FieldTypeController';
import StringPropEditor from '../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class PhoneFieldController extends FieldTypeController {
  name = 'phone';
  title = '[[t:PhoneField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;
  override editorProps = {
    type: 'tel',
  };
  override aiSpec =
    'Phone number field with input mode optimization. Value is stored as a string. ' +
    'The editor applies `type="tel"` for proper mobile keyboard. ' +
    'Use for contact phone numbers, support lines, or any telephone input.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
