import type {
  FormComposedGroup,
  FormComposedRow,
  FormSchemaField,
} from './FormBuilderTypes';

export default class FormBuilderComposerBase {
  composeFields(fields: Iterable<FormSchemaField>): FormComposedRow[] {
    const res: FormComposedRow[] = [];
    for (const field of fields) {
      if (field) {
        res.push({
          className: 'Form-row',
          cells: [
            {
              field,
            },
          ],
        });
      }
    }
    return res;
  }

  groupFields(fields: Iterable<FormSchemaField>): FormComposedGroup[] {
    const group_list: FormComposedGroup[] = [];
    const group_map: { [caption: string]: FormComposedGroup } = {};

    for (const field of fields) {
      if (!field) continue;

      const group_name = field.group ? field.group : '';
      let group = group_map[group_name];
      if (!group_map.hasOwnProperty(group_name)) {
        group = {
          caption: group_name,
          main: [],
          advanced: [],
        };
        group_map[group_name] = group;
        group_list.push(group);
      }

      if (field.advanced) group.advanced.push(field);
      else group.main.push(field);
    }

    return group_list;
  }
}
