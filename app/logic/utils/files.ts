import * as node_path from 'path';
import type { IAppManager } from '../managers/IAppManager';
import type { AssetPropValueFile } from '../types/Props';
import ProjectManager from '../managers/ProjectManager';
import type { IProjectContext } from '#logic/types/IProjectContext';

export type ThumbParams = {
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
};

export enum SharpFit {
  COVER = 'cover',
  CONTAIN = 'contain',
  FILL = 'fill',
  INSIDE = 'inside',
  OUTSIDE = 'outside',
}

export function getSrcByFileId(
  projectContext: IProjectContext,
  file: AssetPropValueFile,
  thumb: ThumbParams | null = null,
): string {
  const store = file.Store;
  const fileId = file.FileId;
  const projectLocalPath = projectContext.projectInfo.localPath;
  if (store === 'loc-project') {
    return (
      'localfile://' +
      encodeURIComponent(
        node_path.join(projectLocalPath ?? '', file.Dir ?? '', file.Title),
      )
    );
  }
  if (thumb) {
    return (
      (projectContext.appManager.$env.FILE_STORAGE_API_HOST ?? '/') +
      `file/${store}/${fileId}/thumb/${thumb.width}/${thumb.height}/${thumb.fit}`
    );
  }
  return (
    (projectContext.appManager.$env.FILE_STORAGE_API_HOST ?? '/') +
    `file/${store}/${fileId}`
  );
}
