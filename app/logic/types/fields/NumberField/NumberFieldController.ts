import { FieldTypeController } from '../../FieldTypeController';
import NumberPropEditor from '../../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { numberFieldAiSpec } from './NumberFieldAiSpec';

export class NumberFieldController extends FieldTypeController {
  name = 'number';
  title = '[[t:NumberField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override aiSpec = numberFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.FLOAT,
    },
  ];
}
