import type { ExtendedMenuListItem } from '../types/MenuList';

export interface IAssetEditorToolbarVM {
  getToolbarActions(): ExtendedMenuListItem[];

  isUndoRedoBusy(): false | 'undo' | 'redo';
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): Promise<void>;
  redo(): Promise<void>;

  isSaving(): boolean;
  getHasChanges(): boolean;
  saveChanges(): Promise<boolean>;
}
