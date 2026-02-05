import { FieldTypeController } from '../FieldTypeController';
import NameTitlePropEditor from '../../../components/Props/NameTitlePropEditor.vue';
import NameTitlePropPresenter from '../../../components/Props/NameTitlePropPresenter.vue';

export class NameTitleFieldController extends FieldTypeController {
  name = 'nameTitle';
  title = '[[t:NameTitleField]]';
  editor = async () => NameTitlePropEditor;
  presenter = async () => NameTitlePropPresenter;
}
