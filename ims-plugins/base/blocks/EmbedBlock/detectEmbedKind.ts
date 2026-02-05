import { parseYoutubeLink } from '#logic/utils/parseLinks';

export enum DetectedEmbedKindType {
  UNKNOWN = 'unknown',
  INVALID = 'invalid',
  GOOGLE_DOC = 'google-doc',
  GOOGLE_SHEET = 'google-sheet',
  GOOGLE_PRESENTATION = 'google-presentation',
  YOUTUBE = 'youtube',
  MIRO = 'miro',
  FIGMA = 'figma',
}

export type DetectedEmbedKind = {
  type: DetectedEmbedKindType;
  iframeLink: string;
};

export function detectEmbedKind(link: string): DetectedEmbedKind {
  if (!/^https:\/\/.+/.test(link)) {
    return {
      iframeLink: '',
      type: DetectedEmbedKindType.INVALID,
    };
  }

  const google_link_match = link.match(
    /^https:\/\/docs\.google\.com\/(spreadsheets|document|presentation)\//,
  );
  if (google_link_match) {
    if (google_link_match[1] === 'spreadsheets') {
      return {
        iframeLink: link,
        type: DetectedEmbedKindType.GOOGLE_SHEET,
      };
    } else if (google_link_match[1] === 'document') {
      return {
        iframeLink: link,
        type: DetectedEmbedKindType.GOOGLE_DOC,
      };
    } else if (google_link_match[1] === 'presentation') {
      return {
        iframeLink: link,
        type: DetectedEmbedKindType.GOOGLE_PRESENTATION,
      };
    }
  }

  const figma_match = link.match(
    /^https:\/\/(www|embed)\.figma\.com\/design\/(.*)$/,
  );
  if (figma_match) {
    const url = new URL('https://embed.figma.com/design/' + figma_match[2]);
    url.searchParams.append('embed-host', 'share');
    return {
      iframeLink: url.toString(),
      type: DetectedEmbedKindType.FIGMA,
    };
  }

  const miro_match = link.match(/^https:\/\/miro\.com\/app\/board\//);
  if (miro_match) {
    return {
      iframeLink: link,
      type: DetectedEmbedKindType.MIRO,
    };
  }

  const youtube_code = parseYoutubeLink(link);
  if (youtube_code) {
    return {
      iframeLink: `https://www.youtube.com/embed/${youtube_code}`,
      type: DetectedEmbedKindType.YOUTUBE,
    };
  }

  return {
    iframeLink: '',
    type: DetectedEmbedKindType.UNKNOWN,
  };
}
