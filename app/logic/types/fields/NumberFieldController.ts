import { FieldTypeController } from '../FieldTypeController';
import NumberPropEditor from '../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class NumberFieldController extends FieldTypeController {
  name = 'number';
  title = '[[t:NumberField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override aiSpec =
    'Floating-point number field. Value is stored as a JavaScript number (float). ' +
    'Use for decimal values like percentages, measurements, multipliers, coordinates, or any non-integer numeric data.';
  override dataTypes = [
    {
      Type: AssetPropType.FLOAT,
    },
  ];
}
