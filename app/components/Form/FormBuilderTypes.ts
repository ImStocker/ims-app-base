import type { Component } from 'vue';
import type FormBuilderModelBase from './FormBuilderModelBase';

export type FormSchemaFieldComponentDeclaration = Component & { meta?: any };

export type FormSchemaFieldPropAccessor = {
  get: (model: FormBuilderModelBase) => any;
  set: (model: FormBuilderModelBase, val: any) => void;
};

export type FormSchemaField = {
  caption: string;
  prop: string | FormSchemaFieldPropAccessor;
  editor: FormSchemaFieldComponentDeclaration;
  editorProps?: Record<string, any>;
  group?: null | string;
  advanced?: boolean;
  tooltip?: string;
  meta?: any; // any additional data
};

export type FormComposedRow = {
  cells: FormComposedCell[];
  className?: string;
};

export type FormComposedCell = {
  field: FormSchemaField;
  relativeWidth?: number;
  className?: string;
};

export type FormComposedGroup = {
  caption: string;
  main: FormSchemaField[];
  advanced: FormSchemaField[];
};

export type FormSchema = Iterable<FormSchemaField>;
