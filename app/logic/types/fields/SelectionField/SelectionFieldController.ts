import { FieldTypeController } from '../../FieldTypeController';
import SelectionPropEditor from '../../../../components/Props/SelectionProp/SelectionPropEditor.vue';
import SelectionPropPresenter from '../../../../components/Props/SelectionProp/SelectionPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { selectionFieldAiSpec } from './SelectionFieldAiSpec';

export class SelectionFieldController extends FieldTypeController {
  name = 'selection';
  title = '[[t:SelectionField]]';
  editor = async () => SelectionPropEditor;
  presenter = async () => SelectionPropPresenter;
  override aiSpec = selectionFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.SELECTION,
    },
  ];
}
