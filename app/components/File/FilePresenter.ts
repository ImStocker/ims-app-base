import validator from 'validator';
import { useAppManager } from '../../composables/useAppManager';
import {
  castAssetPropValueToString,
  isFilledAssetPropValue,
  type AssetPropValue,
  type AssetPropValueFile,
} from '../../logic/types/Props';
import type { ThumbParams } from '../../logic/utils/files';
import { getSrcByFileId } from '../../logic/utils/files';

export type FilePresenterParams = {
  icon: string;
  inlineType: 'img' | 'video' | 'audio' | 'iframe' | null;
  link: string | null;
  ext: string | null;
};

export function useFilePresenterParams(
  file: AssetPropValueFile,
  thumbParams?: ThumbParams,
): FilePresenterParams {
  const appManager = useAppManager();

  const ext = file.Title.substring(
    file.Title.lastIndexOf('.') + 1,
  ).toLowerCase();
  let icon = 'ri-file-3-fill';
  let inlineType: 'img' | 'video' | 'audio' | 'iframe' | null = null;
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'bmp':
    case 'webp':
    case 'svg':
      icon = 'ri-file-image-fill';
      inlineType = 'img';
      break;
    case 'mov':
    case 'mp4':
    case 'avi':
      icon = 'ri-file-video-fill';
      inlineType = 'video';
      break;
    case 'wav':
    case 'mp3':
    case 'aac':
      icon = 'ri-file-music-fill';
      inlineType = 'audio';
      break;
    case 'gif':
      icon = 'ri-file-gif-fill';
      inlineType = 'img';
      break;
    case 'pdf':
      icon = 'ri-file-pdf-2-fill';
      inlineType = 'iframe';
      break;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      icon = 'ri-file-zip-fill';
      inlineType = null;
      break;
    case 'doc':
    case 'docx':
    case 'odt':
      icon = 'ri-file-word-fill';
      inlineType = null;
      break;
    case 'ppt':
    case 'pptx':
    case 'odp':
      icon = 'ri-file-ppt-fill';
      inlineType = null;
      break;
    case 'xls':
    case 'xlsx':
    case 'ods':
      icon = 'ri-file-excel-fill';
      inlineType = null;
      break;
  }
  const link = file
    ? getSrcByFileId(
        appManager,
        file,
        thumbParams && inlineType === 'img' ? thumbParams : null,
      )
    : null;
  return {
    icon,
    inlineType,
    ext,
    link,
  };
}

export function useFilePresenterRenderer() {
  const appManager = useAppManager();
  return (params: {
    value?: AssetPropValue;
    inline?: boolean;
    isStatic?: boolean;
    width?: number | null;
    height?: number | null;
    thumbParams?: ThumbParams;
  }): string => {
    if (!isFilledAssetPropValue(params.value ?? null)) {
      return `<span class="FilePresenter state-none"></span>`;
    }
    const file = (params.value as AssetPropValueFile)?.FileId
      ? (params.value as AssetPropValueFile)
      : null;
    const $t = appManager.$t;
    if (!file) {
      const stringValue = castAssetPropValueToString(params.value ?? null);
      return `<span class="FilePresenter state-error">${validator.escape($t('file.notFile'))}: ${validator.escape(stringValue)}</span>`;
    }
    const fileInfo = useFilePresenterParams(file);
    const displayAsLink = !params.inline || !fileInfo.inlineType;
    if (displayAsLink) {
      return `<span class="FilePresenter type-link is-interactive ${params.isStatic ? 'state-isStatic' : ''}">
            <i class="${validator.escape(fileInfo.icon)}"></i>
            ${validator.escape(file.Title)}
        </span>`;
    }
    const src = validator.escape(fileInfo.link ?? '');
    switch (fileInfo.inlineType) {
      case 'img':
        return `<img
                    class="FilePresenter type-inline is-interactive"
                    src="${src}"
                    ${params.width !== undefined && params.width !== null ? `width="${+params.width}"` : ''}
                    ${params.height !== undefined && params.height !== null ? `height="${+params.height}"` : ''}
                />`;
      case 'video':
        return `<video
                    class="FilePresenter type-inline is-interactive"
                    src="${src}"
                    ${params.width !== undefined && params.width !== null ? `width="${+params.width}"` : ''}
                    ${params.height !== undefined && params.height !== null ? `height="${+params.height}"` : ''}
                    controls
                ></video>`;
      case 'audio':
        return `<figure>
                    <audio
                        class="FilePresenter type-inline is-interactive"
                        controls
                        src="${src}"
                    ></audio>
                </figure>`;
      case 'iframe':
        return `<iframe
                    class="FilePresenter type-inline is-interactive ${fileInfo.ext ? 'type-ext-' + validator.escape(fileInfo.ext) : ''}"
                    src="${src}"
                    ${params.width !== undefined && params.width !== null ? `width="${+params.width}"` : ''}
                    ${params.height !== undefined && params.height !== null ? `height="${+params.height}"` : ''}
                ></iframe>`;
      default:
        return `<span class="FilePresenter type-inline">
                    ${src}
                </span>`;
    }
  };
}
