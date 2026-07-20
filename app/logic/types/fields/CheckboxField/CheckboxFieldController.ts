import { FieldTypeController } from '../../FieldTypeController';
import CheckboxPropEditor from '../../../../components/Props/CheckboxPropEditor.vue';
import CheckboxPropPresenter from '../../../../components/Props/CheckboxPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { checkboxFieldAiSpec } from './CheckboxFieldAiSpec';

export class CheckboxFieldController extends FieldTypeController {
  name = 'checkbox';
  title = '[[t:CheckboxField]]';
  editor = async () => CheckboxPropEditor;
  presenter = async () => CheckboxPropPresenter;

  override aiSpec = checkboxFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.BOOLEAN,
    },
  ];
}
