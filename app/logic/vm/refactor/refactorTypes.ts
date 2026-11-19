import type { AssetPropValue } from '../../types/Props';

export type RefactorKeyChange = {
  kind: 'key';
  blockRef: string;
  blockType: string;
  from: string;
  to: string | null;
};

export type RefactorBlockChange = {
  kind: 'block';
  blockRef: string;
  blockType: string;
  from: string;
  newName: string | null;
  delete: boolean;
};

export type RefactorPrimaryChange = {
  kind: 'primary';
  blockRef: string;
  blockType: string;
  value: AssetPropValue;
};

export type RefactorEnumChange = {
  kind: 'enum';
  oldName: string;
  newName: string;
  oldTitle: string | null;
  newTitle: string | null;
};

export type RefactorChange =
  | RefactorKeyChange
  | RefactorBlockChange
  | RefactorPrimaryChange
  | RefactorEnumChange;

export type RefactorInheritanceChange = Exclude<
  RefactorChange,
  RefactorEnumChange
>;
