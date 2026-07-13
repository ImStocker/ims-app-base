import { FieldTypeController } from '../FieldTypeController';
import DateTimePropEditor from '../../../components/Props/DateTimePropEditor.vue';
import DateTimePropPresenter from '../../../components/Props/DateTimePropPresenter.vue';
import { AssetPropType } from '../Props';

export class DateTimeFieldController extends FieldTypeController {
  name = 'dateTime';
  title = '[[t:DateTimeField]]';
  editor = async () => DateTimePropEditor;
  presenter = async () => DateTimePropPresenter;
  override aiSpec =
    'Date and time picker field. Value is stored as AssetPropValueTimestamp with `Ts` (Unix timestamp in seconds) and `Str` (ISO 8601 string). ' +
    'Use for precise time-based data: event timestamps, deadlines, publish dates, schedules, etc.';
  override dataTypes = [
    {
      Type: AssetPropType.TIMESTAMP,
    },
  ];
}
