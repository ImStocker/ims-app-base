import { FieldTypeController } from '../FieldTypeController';
import TextPropEditor from '../../../components/Props/TextPropEditor.vue';
import TextPropPresenter from '../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../Props';

export class TextFieldController extends FieldTypeController {
  name = 'text';
  title = '[[t:TextField]]';
  editor = async () => TextPropEditor;
  presenter = async () => TextPropPresenter;

  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
