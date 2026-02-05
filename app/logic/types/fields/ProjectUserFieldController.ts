import { FieldTypeController } from '../FieldTypeController';
import ProjectUserPropEditor from '../../../components/Props/ProjectUserPropEditor.vue';
import ProjectUserPropPresenter from '../../../components/Props/ProjectUserPropPresenter.vue';
import { AssetPropType } from '../Props';

export class ProjectUserFieldController extends FieldTypeController {
  name = 'projectUser';
  title = '[[t:ProjectUserField]]';
  editor = async () => ProjectUserPropEditor;
  presenter = async () => ProjectUserPropPresenter;

  override dataTypes = [
    {
      Type: AssetPropType.ACCOUNT,
    },
  ];
}
