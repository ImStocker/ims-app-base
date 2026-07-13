import { FieldTypeController } from '../FieldTypeController';
import NumberPropEditor from '../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class IntegerFieldController extends FieldTypeController {
  name = 'integer';
  title = '[[t:IntegerField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override aiSpec =
    'Whole number (integer) field. Value is stored as a JavaScript number (integer). ' +
    'Use for numeric values that must be whole numbers: counters, quantities, levels, IDs, health points, etc.';
  override dataTypes = [
    {
      Type: AssetPropType.INTEGER,
    },
  ];
}
