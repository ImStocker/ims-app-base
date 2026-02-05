import { FieldTypeController } from '../FieldTypeController';
import CheckboxPropEditor from '../../../components/Props/CheckboxPropEditor.vue';
import CheckboxPropPresenter from '../../../components/Props/CheckboxPropPresenter.vue';
import { AssetPropType } from '../Props';

export class CheckboxFieldController extends FieldTypeController {
  name = 'checkbox';
  title = '[[t:CheckboxField]]';
  editor = async () => CheckboxPropEditor;
  presenter = async () => CheckboxPropPresenter;

  override dataTypes = [
    {
      Type: AssetPropType.BOOLEAN,
    },
  ];
}
