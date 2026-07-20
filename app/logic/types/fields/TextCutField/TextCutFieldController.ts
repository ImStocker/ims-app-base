import { FieldTypeController } from '../../FieldTypeController';
import TextPropEditor from '../../../../components/Props/TextPropEditor.vue';
import TextPropPresenter from '../../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { textCutFieldAiSpec } from './TextCutFieldAiSpec';

export class TextCutFieldController extends FieldTypeController {
  name = 'textCut';
  title = '[[t:TextField]]';
  editor = async () => TextPropEditor;
  presenter = async () => TextPropPresenter;

  override presenterProps = {
    cutLength: 100,
  };

  override aiSpec = textCutFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
