import { MARKDOWN_ASSET_ID } from '../../../../logic/constants';
import { parseAnchorTagId } from '../../../../logic/utils/assets';

export type WikiLinkAddress =
  | { kind: 'asset'; assetId: string }
  | { kind: 'assetHeader'; assetId: string; anchor: string }
  | {
      kind: 'assetBlock';
      assetId: string;
      blockId: string;
      anchor?: string;
    }
  | { kind: 'localHeader'; anchor: string }
  | { kind: 'title'; title: string };

export function buildWikiLink(address: string, label: string): string {
  return `[[${address}|${label}]]`;
}

export function parseWikiLink(text: string): {
  address: string;
  label: string;
} | null {
  // Accepts both the full wiki-link markup (`[[asset:id|Label]]`) and the bare
  // inner content (`asset:id|Label`) — callers slice the syntax-tree node,
  // which may or may not include the surrounding brackets.
  const trimmed = text.trim();
  const inner =
    trimmed.startsWith('[[') && trimmed.endsWith(']]')
      ? trimmed.slice(2, -2)
      : trimmed;
  const match = inner.match(/^([^|\]\n]+)\|([^\]|\n]*)$/);
  if (!match) return null;
  return { address: match[1].trim(), label: match[2].trim() };
}

export function buildAssetAddress(assetId: string): string {
  return `asset:${assetId}`;
}

export function buildHeaderAddress(
  assetId: string,
  blockId: string,
  anchor: string | undefined,
  isMarkdownAsset: boolean,
): string {
  if (isMarkdownAsset) {
    return `asset:${assetId}#${anchor ?? blockId}`;
  }
  return `asset:${assetId}#bid-${blockId}${anchor ? '~' + anchor : ''}`;
}

export function parseLinkAddress(address: string): WikiLinkAddress {
  const trimmed = address.trim();

  const localHeader = trimmed.match(/^#(.+)$/);
  if (localHeader) {
    return { kind: 'localHeader', anchor: localHeader[1] };
  }

  const assetHeader = trimmed.match(
    /^asset:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})#(.+)$/i,
  );
  if (assetHeader) {
    const assetId = assetHeader[1];
    const fragment = assetHeader[2];
    const parsed_tag = parseAnchorTagId(fragment);
    if (parsed_tag) {
      return {
        kind: 'assetBlock',
        assetId,
        blockId: parsed_tag.blockId,
        anchor: parsed_tag.anchor,
      };
    }
    return { kind: 'assetHeader', assetId, anchor: fragment };
  }

  const assetMatch = trimmed.match(
    /^asset:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  if (assetMatch) {
    return { kind: 'asset', assetId: assetMatch[1] };
  }

  return { kind: 'title', title: trimmed };
}

export function isMarkdownAsset(asset: { typeIds?: string[] }): boolean {
  return asset.typeIds?.includes(MARKDOWN_ASSET_ID) ?? false;
}
