import type { AssetPropValue, AssetProps } from './Props';

export type PropsFormDef = {
  fields: PropsFormFieldDef[];
  differentFieldsNum: number;
};

export type PropsFormValueOne = {
  value: AssetPropValue;
  computedValue: AssetPropValue;
  computedState: boolean | string;
  computedSame: boolean;
  inherited: boolean;
  same: boolean;
};

export type PropsFormState = {
  values: {
    [key: string]: PropsFormValueOne;
  };
  combined: AssetProps;
};

export type PropsFormFieldDef = {
  index: number;
  propKey: string;
  propTitle: string;
  propName?: string;
  type: string | null;
  multiple: boolean;
  params: AssetProps;
  differentDefinition: boolean;
  inheritedProp?: boolean;
  hint?: AssetPropValue;
  readonly?: boolean;
};
