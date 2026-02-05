import { FieldTypeController } from '../FieldTypeController';
import StringPropEditor from '../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class StringFieldController extends FieldTypeController {
  name = 'string';
  title = '[[t:StringField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;

  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
