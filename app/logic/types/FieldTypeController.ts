import type { Component } from 'vue';
import type { AssetProps, AssetPropValueType } from './Props';

export type FieldTypeControllerParameter = {
  name: string;
  title: string;
  multiple: boolean;
  type: string;
  params: AssetProps;
  hint?: string;
};

export abstract class FieldTypeController {
  abstract name: string;
  abstract title: string;
  abstract editor: () => Promise<Component>;
  abstract presenter: () => Promise<Component>;

  editorProps: Record<string, any> | undefined = undefined;
  presenterProps: Record<string, any> | undefined = undefined;
  parameters: FieldTypeControllerParameter[] = [];
  dataTypes?: AssetPropValueType[];
}
