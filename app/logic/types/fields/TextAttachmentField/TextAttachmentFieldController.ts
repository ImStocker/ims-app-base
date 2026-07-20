import { FieldTypeController } from '../../FieldTypeController';
import TextAttachmentPropEditor from '../../../../components/Props/TextAttachmentPropEditor.vue';
import TextPropPresenter from '../../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { textAttachmentFieldAiSpec } from './TextAttachmentFieldAiSpec';

export class TextAttachmentFieldController extends FieldTypeController {
  name = 'textAttachment';
  title = '[[t:TextAttachmentField]]';
  editor = async () => TextAttachmentPropEditor;
  presenter = async () => TextPropPresenter;

  override aiSpec = textAttachmentFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
