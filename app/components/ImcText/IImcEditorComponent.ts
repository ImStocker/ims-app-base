import type Delta from 'quill-delta';
import type { IAppManager } from '../../logic/managers/IAppManager';
import type { AssetPropValue } from '../../logic/types/Props';
import type { ImcLinkDrowdownInterface } from './ImcLinksModule';

export interface IImcEditorComponent {
  get $el(): HTMLElement | null;
  get multiline(): boolean;
  get allowTab(): boolean;
  get placeholder(): string;
  get toolbar(): 'default' | 'inline';
  get maxHeight(): number;
  get modelValue(): AssetPropValue;
  get dropdownInterface(): ImcLinkDrowdownInterface;
  get quillContent(): Delta;
  toolbarCoord: null | DOMRect;
  dirtyValue: Delta | undefined;
  onEnter(): Promise<void>;
  onEscape(): Promise<void>;
  onFocus(): Promise<void>;
  onBlur(): Promise<void>;
  $getAppManager(): IAppManager;
  onTextChange(content: Delta): void;
  isFocused(): boolean;
}
