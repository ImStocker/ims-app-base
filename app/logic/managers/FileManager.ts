import { AppSubManagerBase } from './IAppManager';
import type { AssetPropValueFile } from '../types/Props';
import type { ThumbParams } from '../utils/files';

export default class FileManager extends AppSubManagerBase {
  getFileUrl(file: AssetPropValueFile, thumbParams?: ThumbParams): string {
    if (thumbParams) {
      return (
        (this.appManager.$env.FILE_STORAGE_API_HOST ?? '/') +
        `file/${file.Store}/${file.FileId}/thumb/${thumbParams.width}/${thumbParams.height}/${thumbParams.fit}`
      );
    }
    return (
      (this.appManager.$env.FILE_STORAGE_API_HOST ?? '/') +
      `file/${file.Store}/${file.FileId}`
    );
  }
}
