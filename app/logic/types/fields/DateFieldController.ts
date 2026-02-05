import { FieldTypeController } from '../FieldTypeController';
import DatePropEditor from '../../../components/Props/DatePropEditor.vue';
import DatePropPresenter from '../../../components/Props/DatePropPresenter.vue';
import { AssetPropType } from '../Props';

export class DateFieldController extends FieldTypeController {
  name = 'date';
  title = '[[t:DateField]]';
  editor = async () => DatePropEditor;
  presenter = async () => DatePropPresenter;
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
