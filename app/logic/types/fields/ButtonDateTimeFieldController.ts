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
  override dataTypes = [
    {
      Type: AssetPropType.TIMESTAMP,
    },
  ];
}
