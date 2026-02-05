import { FieldTypeController } from '../FieldTypeController';
import NumberPropEditor from '../../../components/Props/NumberPropEditor.vue';
import StringPropPresenter from '../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../Props';

export class IntegerFieldController extends FieldTypeController {
  name = 'integer';
  title = '[[t:IntegerField]]';
  editor = async () => NumberPropEditor;
  presenter = async () => StringPropPresenter;
  override dataTypes = [
    {
      Type: AssetPropType.INTEGER,
    },
  ];
}
