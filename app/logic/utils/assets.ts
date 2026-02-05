import type { AssetReferenceEntity } from '../types/AssetsType';
import type { AssetBlockEntity } from '../types/BlocksType';
import type { AssetProps, AssetPropValueText } from '../types/Props';
import type { PropsFormState, PropsFormValueOne } from '../types/PropsForm';
import type { AssetRights } from '../types/Rights';
import { createSlug } from './stringUtils';

const TranslatedTitleRegexp = /^\[\[t:(.+)\]\]$/;
const TranslatedTitleLocaleRegexp = /^(.+?):(.+)$/;
export function convertTranslatedTitle(
  title: string,
  $t: (key: string, params?: any) => string,
): string {
  if (!title) return '';
  const translated_title = title.match(TranslatedTitleRegexp);
  if (translated_title) {
    if (translated_title[1][0] === '|') {
      const locales = Object.fromEntries(
        translated_title[1]
          .split('|')
          .map((t) => {
            const loc = t.match(TranslatedTitleLocaleRegexp);
            return loc ? [loc[1], loc[2].replace('\\n', '\n')] : null;
          })
          .filter((t) => t) as any,
      );
      const ln = $t('localeName');
      return locales.hasOwnProperty(ln) ? locales[ln] : title;
    }
    const tname = 'translatedTitles.' + translated_title[1];
    const res = $t(tname);
    if (res === tname) return title;
    else return res;
  } else return title;
}

export function partedFilename(filename: string) {
  const parts_of_name = filename.split('.');
  const splitted = parts_of_name;
  let extension = '';
  if (splitted.length > 1) {
    extension = '.' + splitted.slice(1).join('.');
  }
  return { title: parts_of_name[0], extension: extension };
}

export function getBlockAnchor(
  resolved_block: ResolvedAssetBlock,
  by_id: boolean = false,
) {
  if (by_id || !resolved_block.name) {
    return 'bid-' + resolved_block.id;
  } else {
    return 'bnm-' + createSlug(resolved_block.name);
  }
}

export function makeBlockIdAnchorTagId(blockId: string) {
  return `bid-${blockId}`;
}

export function makeBlockNameAnchorTagId(blockName: string) {
  const slug = createSlug(blockName, {
    from: 0,
    to: 20,
  });
  return `bnm-${slug}`;
}

export function makeAnchorTagId(block_id: string, anchor?: string) {
  return `bid-${block_id}${anchor ? '~' + anchor : ''}`;
}

export function getPreferenceKeyForBlock(block: ResolvedAssetBlock) {
  return block.assetId + '---' + block.id;
}

export function parseAnchorTagId(
  tag_id: string,
): { blockId: string; anchor?: string } | null {
  const match = tag_id.match(
    /^bid-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(~(.*))?$/,
  );
  if (!match) return null;
  return {
    blockId: match[1],
    anchor: match[3],
  };
}

export function extractHeaderAnchorsFromText(
  text: AssetPropValueText,
): { title: string; level: number; anchor: string }[] {
  const ops = text.Ops;
  const headers: { title: string; level: number; anchor: string }[] = [];
  const used_anchors = new Set<string>();
  for (let index = 0; index < ops.length; index++) {
    const current_op = ops[index];
    if (current_op.attributes?.header) {
      let header_text = '';
      for (let i = index - 1; i >= 0; i--) {
        if (typeof ops[i].insert === 'string') {
          header_text = ops[i].insert + header_text;
          const header_text_split = header_text.split('\n');
          if (header_text_split.length > 1) {
            header_text = header_text_split[header_text_split.length - 1];
            break;
          }
        }
      }
      header_text = header_text.trim();
      if (header_text) {
        const anchor = generateTextHeaderAnchor(header_text, used_anchors);
        used_anchors.add(anchor);
        headers.push({
          title: header_text,
          level: current_op.attributes.header,
          anchor: anchor,
        });
      }
    }
  }
  return headers;
}

export function generateTextHeaderAnchor(
  title: string,
  used_anchors?: Set<string>,
) {
  let index = 0;
  while (true) {
    let slug = createSlug(title, {
      from: 0,
      to: 20,
    });
    if (index > 0) slug += '-' + index;
    if (!used_anchors || !used_anchors.has(slug)) {
      return slug;
    }
    index++;
  }
}

export type ResolvedAssetBlock = AssetBlockEntity & {
  assetId: string;
  rights: AssetRights;
  references: AssetReferenceEntity[];
};

export type ResolvedAssetBlocks = {
  list: ResolvedAssetBlock[];
  mapIds: { [blockId: string]: ResolvedAssetBlock };
  mapNames: { [blockName: string]: ResolvedAssetBlock };
  done: boolean;
};

export type AssetDisplayMode = 'normal' | 'page' | 'print';

export type AssetLocalizableField = {
  propKey: string;
  localeKey: string;
  title: string;
  type: string;
};

export function makeFormStateFromProps(props: AssetProps): PropsFormState {
  return {
    combined: props,
    values: Object.fromEntries(
      [...Object.entries(props)].map(([key, val]) => {
        return [
          key,
          {
            computedSame: true,
            computedState: true,
            computedValue: val,
            inherited: false,
            same: true,
            value: val,
          } as PropsFormValueOne,
        ];
      }),
    ),
  };
}
