import { FieldTypeController } from '../FieldTypeController';
import CheckboxPropEditor from '../../../components/Props/CheckboxPropEditor.vue';
import CheckboxPropPresenter from '../../../components/Props/CheckboxPropPresenter.vue';
import { AssetPropType } from '../Props';

export class CheckboxFieldController extends FieldTypeController {
  name = 'checkbox';
  title = '[[t:CheckboxField]]';
  editor = async () => CheckboxPropEditor;
  presenter = async () => CheckboxPropPresenter;

  override aiSpec =
    'Boolean toggle (checkbox) field. Value is stored as true/false. ' +
    'Use for yes/no flags, toggles, enable/disable settings, or any binary option. ' +
    'When `multiple` is set, each value is stored as 1 (true) or 0 (false) in the array.';
  override dataTypes = [
    {
      Type: AssetPropType.BOOLEAN,
    },
  ];
}
