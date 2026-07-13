import { FieldTypeController } from '../FieldTypeController';
import ProjectUserPropEditor from '../../../components/Props/ProjectUserPropEditor.vue';
import ProjectUserPropPresenter from '../../../components/Props/ProjectUserPropPresenter.vue';
import { AssetPropType } from '../Props';

export class ProjectUserFieldController extends FieldTypeController {
  name = 'projectUser';
  title = '[[t:ProjectUserField]]';
  editor = async () => ProjectUserPropEditor;
  presenter = async () => ProjectUserPropPresenter;

  override aiSpec =
    'Project user/account selector. Value is stored as AssetPropValueAccount with `AccountId` and `Name`. ' +
    'Use to assign a registered project user to a property — e.g. responsible person, voice actor, reviewer, author. ' +
    'The editor shows a searchable list of project members.';
  override dataTypes = [
    {
      Type: AssetPropType.ACCOUNT,
    },
  ];
}
