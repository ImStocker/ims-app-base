import { FieldTypeController } from '../../FieldTypeController';
import GalleryItemPropEditor from '../../../../components/Props/GalleryItemPropEditor.vue';
import { galleryItemFieldAiSpec } from './GalleryItemFieldAiSpec';

export class GalleryItemFieldController extends FieldTypeController {
  name = 'galleryItem';
  title = '[[t:GalleryItemField]]';
  editor = async () => GalleryItemPropEditor;
  presenter = async () => GalleryItemPropEditor;
  override aiSpec = galleryItemFieldAiSpec.aiSpec;
}
