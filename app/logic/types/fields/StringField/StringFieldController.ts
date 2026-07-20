import { FieldTypeController } from '../../FieldTypeController';
import StringPropEditor from '../../../../components/Props/StringPropEditor.vue';
import StringPropPresenter from '../../../../components/Props/StringPropPresenter.vue';
import { AssetPropType } from '../../Props';
import { stringFieldAiSpec } from './StringFieldAiSpec';

export class StringFieldController extends FieldTypeController {
  name = 'string';
  title = '[[t:StringField]]';
  editor = async () => StringPropEditor;
  presenter = async () => StringPropPresenter;

  override aiSpec = stringFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
