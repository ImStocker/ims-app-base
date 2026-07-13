import { FieldTypeController } from '../FieldTypeController';
import TextAttachmentPropEditor from '../../../components/Props/TextAttachmentPropEditor.vue';
import TextPropPresenter from '../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../Props';

export class TextAttachmentFieldController extends FieldTypeController {
  name = 'textAttachment';
  title = '[[t:TextAttachmentField]]';
  editor = async () => TextAttachmentPropEditor;
  presenter = async () => TextPropPresenter;

  override aiSpec =
    'Rich text field with inline file attachment support. Value is stored as AssetPropValueText, same as `text`. ' +
    'Unlike plain `text`, this field allows embedding file attachments (images, documents) directly inside the rich text content. ' +
    'Use when formatted text needs embedded media — e.g. illustrated descriptions, reference documents with screenshots.';
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
