import { FieldTypeController } from '../FieldTypeController';
import DateTimePropEditor from '../../../components/Props/DateTimePropEditor.vue';
import DateTimePropPresenter from '../../../components/Props/DateTimePropPresenter.vue';
import { AssetPropType } from '../Props';

export class DateTimeFieldController extends FieldTypeController {
  name = 'dateTime';
  title = '[[t:DateTimeField]]';
  editor = async () => DateTimePropEditor;
  presenter = async () => DateTimePropPresenter;
  override dataTypes = [
    {
      Type: AssetPropType.TIMESTAMP,
    },
  ];
}
