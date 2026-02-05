import type { DoTaskResult } from '../../../logic/managers/UiManager';

export interface EditorBlockHandler {
  save(): Promise<DoTaskResult<void>>;
}
