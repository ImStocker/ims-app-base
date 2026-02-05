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
  override dataTypes = [
    {
      Type: AssetPropType.FILE,
    },
  ];
}
