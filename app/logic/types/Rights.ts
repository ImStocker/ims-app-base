export enum AssetRights {
  // Ассет/блок не видим
  NO = 0,
  // Ассет/блок виден, но доступен только для чтения
  // Новые ассеты создавать нельзя
  // Удалять ассеты нельзя
  READ_ONLY = 1,
  // Ассет/блок виден, но доступен только для комментрирования
  // Новые ассеты создавать нельзя
  // Удалять ассеты нельзя
  COMMENT = 2,
  // В блоке можно редактировать только пустые значения корневых свойств (\*)
  // Ассеты можно создавать только тех типов, к которым доступ есть с типом FILL_EMPTY
  // В ассете нельзя создавать или удалять блоки, нельзя менять никакие параметры ассета
  FILL_EMPTY = 3,
  // В блоке можно редактировать любые значения корневых свойств (\*)
  // Ассеты можно создавать только тех типов, к которым доступ есть с типом WRITE_VALUES
  // В ассете нельзя создавать или удалять блоки, у ассета можно менять любые параметры
  WRITE_VALUES = 4,
  // В блоке можно редактировать любые значения, блок можно переименовывать
  // Можно создавть ассеты любого типа
  // В ассете можно создавать и удалять блоки, можно менять любые параметры
  FULL_ACCESS = 5,
}

export const MIN_ASSET_RIGHTS_TO_READ = AssetRights.READ_ONLY;
export const MIN_ASSET_RIGHTS_TO_CHANGE = AssetRights.FILL_EMPTY;
export const MIN_ASSET_RIGHTS_TO_DELETE = AssetRights.FULL_ACCESS;
export const MIN_ASSET_RIGHTS_TO_RENAME = AssetRights.WRITE_VALUES;
export const MIN_ASSET_RIGHTS_TO_MOVE = AssetRights.WRITE_VALUES;
export const MIN_ASSET_RIGHTS_TO_HISTORY = AssetRights.FULL_ACCESS;
export const MIN_ASSET_RIGHTS_TO_ADD_REF = AssetRights.FILL_EMPTY;
export const MIN_ASSET_RIGHTS_TO_DELETE_REF = AssetRights.FILL_EMPTY;

export const MIN_WORKSPACE_RIGHTS_TO_READ = AssetRights.READ_ONLY;
export const MIN_WORKSPACE_RIGHTS_TO_COMMENT = AssetRights.COMMENT;
export const MIN_WORKSPACE_RIGHTS_TO_ADD_CONTENT = AssetRights.FILL_EMPTY;
export const MIN_WORKSPACE_RIGHTS_TO_CHANGE = AssetRights.WRITE_VALUES;
export const MIN_WORKSPACE_RIGHTS_TO_MOVE = AssetRights.WRITE_VALUES;
export const MIN_WORKSPACE_RIGHTS_TO_DELETE = AssetRights.FULL_ACCESS;
export const MIN_WORKSPACE_RIGHTS_TO_RENAME = AssetRights.FULL_ACCESS;
