import { AssetSelectorFieldController } from '#logic/types/fields/AssetSelectorFieldController';
import { AttachmentFieldController } from '#logic/types/fields/AttachmentFieldController';
import { AttributeTypeFieldController } from '#logic/types/fields/AttributeTypeFieldController';
import { ButtonDateTimeFieldController } from '#logic/types/fields/ButtonDateTimeFieldController';
//import { CatalogProjectFieldController } from '../../../../../ims-creators-app/app/logic/types/fields/CatalogProjectFieldController';
import { CheckboxFieldController } from '#logic/types/fields/CheckboxFieldController';
import { CollectionAssetTitleController } from '#logic/types/fields/CollectionAssetTitleFieldController';
import { DateFieldController } from '#logic/types/fields/DateFieldController';
import { DateTimeFieldController } from '#logic/types/fields/DateTimeFieldController';
import { EmailFieldController } from '#logic/types/fields/EmailFieldController';
import { EnumFieldController } from '#logic/types/fields/EnumFieldController';
import { EnumRadioFieldController } from '#logic/types/fields/EnumRadioFieldController';
import { FieldParamsFieldController } from '#logic/types/fields/FieldParamsFieldController';
import { GddElementSelectorFieldController } from '#logic/types/fields/gddElementSelectorFieldController';
import { IntegerFieldController } from '#logic/types/fields/IntegerFieldController';
import { NameTitleFieldController } from '#logic/types/fields/NameTitleFieldController';
import { NumberFieldController } from '#logic/types/fields/NumberFieldController';
import { PhoneFieldController } from '#logic/types/fields/PhoneFieldController';
import { ProjectUserFieldController } from '#logic/types/fields/ProjectUserFieldController';
import { StringFieldController } from '#logic/types/fields/StringFieldController';
import { StructFieldController } from '#logic/types/fields/StructFieldController';
//import { TaskColumnFieldController } from '../../../../../ims-creators-app/app/logic/types/fields/TaskColumnFieldController';
import { TextAttachmentFieldController } from '#logic/types/fields/TextAttachmentFieldController';
import { TextFieldController } from '#logic/types/fields/TextFieldController';
import { TextCutFieldController } from '#logic/types/fields/TextCutFieldController';
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
