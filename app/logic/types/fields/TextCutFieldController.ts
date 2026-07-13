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

  override aiSpec =
    'Rich text field with automatic truncation in presentation mode. Value is stored as AssetPropValueText. ' +
    'Same as `text` but the presenter truncates content to 100 characters with "..." for preview/list views. ' +
    'Use for long text that should be summarized in compact UI contexts while keeping full content editable.';
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
