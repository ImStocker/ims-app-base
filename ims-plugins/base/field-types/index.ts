import { AssetSelectorFieldController } from '#logic/types/fields/AssetSelectorField/AssetSelectorFieldController';
import { AttachmentFieldController } from '#logic/types/fields/AttachmentField/AttachmentFieldController';
import { AttributeTypeFieldController } from '#logic/types/fields/AttributeTypeField/AttributeTypeFieldController';
import { ButtonDateTimeFieldController } from '#logic/types/fields/ButtonDateTimeField/ButtonDateTimeFieldController';
//import { CatalogProjectFieldController } from '../../../../../ims-creators-app/app/logic/types/fields/CatalogProjectFieldController';
import { CheckboxFieldController } from '#logic/types/fields/CheckboxField/CheckboxFieldController';
import { CollectionAssetTitleController } from '#logic/types/fields/CollectionAssetTitleField/CollectionAssetTitleFieldController';
import { DateFieldController } from '#logic/types/fields/DateField/DateFieldController';
import { DateTimeFieldController } from '#logic/types/fields/DateTimeField/DateTimeFieldController';
import { EmailFieldController } from '#logic/types/fields/EmailField/EmailFieldController';
import { EnumFieldController } from '#logic/types/fields/EnumField/EnumFieldController';
import { EnumRadioFieldController } from '#logic/types/fields/EnumRadioField/EnumRadioFieldController';
import { FieldParamsFieldController } from '#logic/types/fields/FieldParamsField/FieldParamsFieldController';
import { GddElementSelectorFieldController } from '#logic/types/fields/GddElementSelectorField/gddElementSelectorFieldController';
import { IntegerFieldController } from '#logic/types/fields/IntegerField/IntegerFieldController';
import { NameTitleFieldController } from '#logic/types/fields/NameTitleField/NameTitleFieldController';
import { NumberFieldController } from '#logic/types/fields/NumberField/NumberFieldController';
import { PhoneFieldController } from '#logic/types/fields/PhoneField/PhoneFieldController';
import { ProjectUserFieldController } from '#logic/types/fields/ProjectUserField/ProjectUserFieldController';
import { StringFieldController } from '#logic/types/fields/StringField/StringFieldController';
import { StructFieldController } from '#logic/types/fields/StructField/StructFieldController';
//import { TaskColumnFieldController } from '../../../../../ims-creators-app/app/logic/types/fields/TaskColumnFieldController';
import { TextAttachmentFieldController } from '#logic/types/fields/TextAttachmentField/TextAttachmentFieldController';
import { TextFieldController } from '#logic/types/fields/TextField/TextFieldController';
import { TextCutFieldController } from '#logic/types/fields/TextCutField/TextCutFieldController';
//import { LocaleBlockKeyController } from '../../../../../ims-creators-app/app/logic/types/fields/LocaleBlockKeyFieldController';
//import { LocaleBlockStatusFieldController } from '../../../../../ims-creators-app/app/logic/types/fields/LocaleBlockStatusFieldController';

export default function () {
  return [
    new StringFieldController(),
    new IntegerFieldController(),
    new NumberFieldController(),
    new TextFieldController(),
    new AttributeTypeFieldController(),
    new ButtonDateTimeFieldController(),
    new CheckboxFieldController(),
    new DateTimeFieldController(),
    new DateFieldController(),
    new ProjectUserFieldController(),
    //new TaskColumnFieldController(),
    new AssetSelectorFieldController(),
    new GddElementSelectorFieldController(),
    new AttachmentFieldController(),
    new StructFieldController(),
    new EnumFieldController(),
    new EnumRadioFieldController(),
    new FieldParamsFieldController(),
    new TextAttachmentFieldController(),
    new NameTitleFieldController(),
    //new CatalogProjectFieldController(),
    new EmailFieldController(),
    new PhoneFieldController(),
    new CollectionAssetTitleController(),
    new TextCutFieldController(),
    //new LocaleBlockKeyController(),
    //new LocaleBlockStatusFieldController(),
  ]
    .filter((el) => el)
    .map((el) => {
      return {
        type: 'field',
        content: {
          controller: el,
        },
      };
    });
}
