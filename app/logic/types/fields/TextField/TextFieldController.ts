import { FieldTypeController } from '../../FieldTypeController';
import TextPropEditor from '../../../../components/Props/TextPropEditor.vue';
import TextPropPresenter from '../../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { textFieldAiSpec } from './TextFieldAiSpec';

export class TextFieldController extends FieldTypeController {
  name = 'text';
  title = '[[t:TextField]]';
  editor = async () => TextPropEditor;
  presenter = async () => TextPropPresenter;

  override aiSpec = textFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
