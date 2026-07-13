import { FieldTypeController } from '../FieldTypeController';
import AttachmentPropEditor from '../../../components/Props/AttachmentPropEditor.vue';
import AttachmentPropPresenter from '../../../components/Props/AttachmentPropPresenter.vue';
import { AssetPropType } from '../Props';

export class AttachmentFieldController extends FieldTypeController {
  name = 'attachment';
  title = '[[t:AttachmentField]]';
  editor = async () => AttachmentPropEditor;
  presenter = async () => AttachmentPropPresenter;
  override parameters = [
    {
      name: 'accept',
      multiple: false,
      title: '[[t:FileExtensions]]',
      type: 'string',
      params: {},
      hint: '[[t:|en:File extensions separated by comma: .jpg, .jpeg, .png|ru:Расширения файлов через запятую: .jpg, .jpeg, .png]]',
    },
  ];
  override aiSpec =
    'File attachment field. Value is stored as AssetPropValueFile with `FileId`, `Title`, `Size`, `Dir`, and `Store`. ' +
    'Use to attach files: images, documents, audio, or any binary resource. ' +
    'Parameter `accept` (string) filters allowed file extensions (e.g. ".jpg,.jpeg,.png"). ' +
    'Files are uploaded to the configured file storage backend.';
  override dataTypes = [
    {
      Type: AssetPropType.FILE,
    },
  ];
}
