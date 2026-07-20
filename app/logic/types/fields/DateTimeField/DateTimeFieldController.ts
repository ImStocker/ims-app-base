import { FieldTypeController } from '../../FieldTypeController';
import DateTimePropEditor from '../../../../components/Props/DateTimePropEditor.vue';
import DateTimePropPresenter from '../../../../components/Props/DateTimePropPresenter.vue';
import { AssetPropType } from '../../Props';
import { dateTimeFieldAiSpec } from './DateTimeFieldAiSpec';

export class DateTimeFieldController extends FieldTypeController {
  name = 'dateTime';
  title = '[[t:DateTimeField]]';
  editor = async () => DateTimePropEditor;
  presenter = async () => DateTimePropPresenter;
  override aiSpec = dateTimeFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.TIMESTAMP,
    },
  ];
}
