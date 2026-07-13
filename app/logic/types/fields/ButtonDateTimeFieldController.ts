import { FieldTypeController } from '../FieldTypeController';
import DateTimePropPresenter from '../../../components/Props/DateTimePropPresenter.vue';
import ButtonDateTimePropEditor from '../../../components/Props/ButtonDateTimePropEditor.vue';
import { AssetPropType } from '../Props';

export class ButtonDateTimeFieldController extends FieldTypeController {
  name = 'buttonDateTime';
  title = '[[t:ButtonDateTimeField]]';
  editor = async () => ButtonDateTimePropEditor;
  presenter = async () => DateTimePropPresenter;
  override parameters = [
    {
      name: 'caption',
      multiple: false,
      title: '[[t:Caption]]',
      type: 'string',
      params: {},
    },
    {
      name: 'confirm',
      multiple: false,
      title: '[[t:NeedConfirm]]',
      type: 'checkbox',
      params: {},
    },
  ];
  override aiSpec =
    'Button-triggered dateTime stamp field. Value is stored as AssetPropValueTimestamp. ' +
    'Unlike `dateTime` which shows a continuous picker, this displays a button that sets the timestamp on click. ' +
    'Use for single-click actions like "Mark as published", "Approve", "Start review". ' +
    'Parameters: `caption` (string — button label), `confirm` (checkbox — require confirmation before setting).';
  override dataTypes = [
    {
      Type: AssetPropType.TIMESTAMP,
    },
  ];
}
