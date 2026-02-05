import { FieldTypeController } from '../FieldTypeController';
import NumberPropEditor from '../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class NumberFieldController extends FieldTypeController {
  name = 'number';
  title = '[[t:NumberField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override dataTypes = [
    {
      Type: AssetPropType.FLOAT,
    },
  ];
}
