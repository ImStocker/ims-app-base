import { FieldTypeController } from '../../FieldTypeController';
import AttributeTypePropEditor from '../../../../components/Props/AttributeTypePropEditor.vue';
import AttributeTypePropPresenter from '../../../../components/Props/AttributeTypePropPresenter.vue';
import { AssetPropType } from '../../Props';
import { attributeTypeFieldAiSpec } from './AttributeTypeFieldAiSpec';

export class AttributeTypeFieldController extends FieldTypeController {
  name = 'attributeType';
  title = '[[t:AttributeTypeField]]';
  editor = async () => AttributeTypePropEditor;
  presenter = async () => AttributeTypePropPresenter;
  override aiSpec = attributeTypeFieldAiSpec.aiSpec;
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
