import { FieldTypeController } from '../FieldTypeController';
import DatePropEditor from '../../../components/Props/DatePropEditor.vue';
import DatePropPresenter from '../../../components/Props/DatePropPresenter.vue';
import { AssetPropType } from '../Props';

export class DateFieldController extends FieldTypeController {
  name = 'date';
  title = '[[t:DateField]]';
  editor = async () => DatePropEditor;
  presenter = async () => DatePropPresenter;
  override aiSpec =
    'Date-only picker field (no time component). Value is stored as a plain date string. ' +
    'Use when only the calendar date matters without time (e.g. birth date, release date). ' +
    'For date+time use `dateTime` instead.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
