import { FieldTypeController } from '../FieldTypeController';
import NameTitlePropEditor from '../../../components/Props/NameTitlePropEditor.vue';
import NameTitlePropPresenter from '../../../components/Props/NameTitlePropPresenter.vue';

export class NameTitleFieldController extends FieldTypeController {
  name = 'nameTitle';
  title = '[[t:NameTitleField]]';
  override aiSpec =
    'Combined name + title pair field. Stores two related string values as separate flat props: ' +
    'a system `name` at `{propKey}` (identifier/slug) and a display `title` at `{parentPath}\\title`. ' +
    'Use when an entity needs both a technical key and a human-readable label (e.g. item name + display title).';
  editor = async () => NameTitlePropEditor;
  presenter = async () => NameTitlePropPresenter;
}
