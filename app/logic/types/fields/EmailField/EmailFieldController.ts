import { FieldTypeController } from '../../FieldTypeController';
import StringPropEditor from '../../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { emailFieldAiSpec } from './EmailFieldAiSpec';

export class EmailFieldController extends FieldTypeController {
  name = 'email';
  title = '[[t:EmailField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;
  override editorProps = {
    type: 'email',
  };
  override aiSpec = emailFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
