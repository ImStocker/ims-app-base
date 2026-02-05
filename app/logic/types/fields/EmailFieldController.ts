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
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
