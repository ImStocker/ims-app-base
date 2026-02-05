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
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
