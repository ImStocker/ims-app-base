import { FieldTypeController } from '../FieldTypeController';
import AttributeTypePropEditor from '../../../components/Props/AttributeTypePropEditor.vue';
import AttributeTypePropPresenter from '../../../components/Props/AttributeTypePropPresenter.vue';
import { AssetPropType } from '../Props';

export class AttributeTypeFieldController extends FieldTypeController {
  name = 'attributeType';
  title = '[[t:AttributeTypeField]]';
  editor = async () => AttributeTypePropEditor;
  presenter = async () => AttributeTypePropPresenter;
  override aiSpec =
    'Attribute type selector field. Value is stored as a string representing an attribute type key. ' +
    'Use for selecting or defining attribute types (e.g. character stats like strength, agility, intelligence) ' +
    'from the project\'s attribute type registry.';
  override dataTypes = [
    {
      Type: AssetPropType.STRING,
    },
  ];
}
