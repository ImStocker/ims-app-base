import { FieldTypeController } from '../FieldTypeController';
import TextPropEditor from '../../../components/Props/TextPropEditor.vue';
import TextPropPresenter from '../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../Props';

export class TextCutFieldController extends FieldTypeController {
  name = 'textCut';
  title = '[[t:TextField]]';
  editor = async () => TextPropEditor;
  presenter = async () => TextPropPresenter;

  override presenterProps = {
    cutLength: 100,
  };

  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
