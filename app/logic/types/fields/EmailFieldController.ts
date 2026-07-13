import { FieldTypeController } from '../FieldTypeController';
import StringPropEditor from '../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class EmailFieldController extends FieldTypeController {
  name = 'email';
  title = '[[t:EmailField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;
  override editorProps = {
    type: 'email',
  };
  override aiSpec =
    'Email address field with built-in validation. Value is stored as a string. ' +
    'The editor applies `type="email"` input mode for proper mobile keyboard and browser validation. ' +
    'Use for contact emails, account emails, notification addresses.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
