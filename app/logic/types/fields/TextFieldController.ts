import { FieldTypeController } from '../FieldTypeController';
import TextPropEditor from '../../../components/Props/TextPropEditor.vue';
import TextPropPresenter from '../../../components/Props/TextPropPresenter.vue';
import { AssetPropType } from '../Props';

export class TextFieldController extends FieldTypeController {
  name = 'text';
  title = '[[t:TextField]]';
  editor = async () => TextPropEditor;
  presenter = async () => TextPropPresenter;

  override aiSpec =
    'Rich text field supporting formatted content (bold, italic, headers, lists, links, etc.). ' +
    'Value is stored as AssetPropValueText with `Str` (plain text rendering) and `Ops` (Quill Delta operations). ' +
    'Use for multi-line formatted descriptions, notes, or any rich content.';
  override dataTypes = [
    {
      Type: AssetPropType.TEXT,
    },
  ];
}
