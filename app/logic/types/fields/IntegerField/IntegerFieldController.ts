import { FieldTypeController } from '../../FieldTypeController';
import NumberPropEditor from '../../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { integerFieldAiSpec } from './IntegerFieldAiSpec';

export class IntegerFieldController extends FieldTypeController {
  name = 'integer';
  title = '[[t:IntegerField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override aiSpec = integerFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.INTEGER,
    },
  ];
}
