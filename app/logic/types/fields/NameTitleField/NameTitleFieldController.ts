import { FieldTypeController } from '../../FieldTypeController';
import NameTitlePropEditor from '../../../../components/Props/NameTitlePropEditor.vue';
import NameTitlePropPresenter from '../../../../components/Props/NameTitlePropPresenter.vue';
import { nameTitleFieldAiSpec } from './NameTitleFieldAiSpec';

export class NameTitleFieldController extends FieldTypeController {
  name = 'nameTitle';
  title = '[[t:NameTitleField]]';
  override aiSpec = nameTitleFieldAiSpec.aiSpec;
  editor = async () => NameTitlePropEditor;
  presenter = async () => NameTitlePropPresenter;
}
