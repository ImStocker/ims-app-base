import { syntaxTree } from '@codemirror/language';
import { RangeSet, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { EditorState, Extension, Range } from '@codemirror/state';
import type { DecorationSet, WidgetType, ViewUpdate } from '@codemirror/view';
import type { PluginConfig } from './index';
import CreatorAssetManager from '../../../../logic/managers/CreatorAssetManager';
import type { IAppManager } from '../../../../logic/managers/IAppManager';
import EditorManager from '../../../../logic/managers/EditorManager';
import UiManager from '../../../../logic/managers/UiManager';
import { getProjectLinkHref } from '../../../../logic/router/routes-helpers';
import ProjectManager from '../../../../logic/managers/ProjectManager';
import {
  parseLinkAddress,
  parseWikiLink,
  type WikiLinkAddress,
} from './format';
import { getLegacyCachedAssetFromString } from './legacy-format';

interface WikiLinkWidget extends WidgetType {
  compare: (widget: WikiLinkWidget) => boolean;
  key: string;
}

function scrollToElementTag(view: EditorView, tag_id: string) {
  const cm_scroller = view.dom.closest('.cm-scroller');
  if (cm_scroller) {
    const element = cm_scroller.querySelector(`#${CSS.escape(tag_id)}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function openWikiLinkAddress(
  address: WikiLinkAddress,
  appManager: IAppManager,
) {
  const editor_manager = appManager.get(EditorManager);

  switch (address.kind) {
    case 'asset':
      editor_manager.openAsset(address.assetId, 'popup');
      break;
    case 'assetBlock':
      editor_manager.openAsset(
        address.assetId,
        'popup',
        address.blockId,
        address.anchor,
      );
      break;
    case 'assetHeader':
      editor_manager
        .requestEditorContextForAsset(address.assetId)
        .promise.then((context) => {
          const item = context
            ?.getContentItems()
            .find((content_item) => content_item.anchor === address.anchor);
          if (item) {
            editor_manager.revealBlockContentIds(
              address.assetId,
              item.blockId,
              [item.itemId],
            );
          }
          editor_manager.openAsset(
            address.assetId,
            'popup',
            item?.blockId,
            address.anchor,
          );
        })
        .catch(() => {
          editor_manager.openAsset(address.assetId, 'popup');
        });
      break;
  }
}

async function openAssetByTitle(appManager: IAppManager, title: string) {
  await appManager.get(UiManager).doTask(async () => {
    const asset_manager = appManager.get(CreatorAssetManager);
    const cached_asset = asset_manager.getAssetShortByTitleViaCacheSync(title);
    if (cached_asset?.id) {
      appManager.get(EditorManager).openAsset(cached_asset.id, 'popup');
      return;
    }
    const res = await asset_manager.getAssetShortsList({
      where: {
        title,
        inside: 'gdd',
        isSystem: false,
      },
      count: 1,
    });
    const first = res?.list?.[0];
    if (!first?.id) {
      throw new Error(appManager.$t('markdownBlock.assetNotFound', { title }));
    }
    appManager.get(EditorManager).openAsset(first.id, 'popup');
  });
}

function createWikiLinkWidget(
  link_data: {
    title: string;
    id?: string;
    key: string;
    address?: WikiLinkAddress;
    href?: string;
    onClick?: (e: MouseEvent) => void;
  },
  appManager: IAppManager,
): WikiLinkWidget {
  return {
    coordsAt: () => null,
    compare: (other) => {
      return other.key === link_data.key;
    },
    destroy: () => {},
    eq: (other: WikiLinkWidget) => {
      return other.key === link_data.key;
    },
    key: link_data.key,
    estimatedHeight: -1,
    ignoreEvent: () => true,
    lineBreaks: 0,
    toDOM: () => {
      const a = document.createElement('a');
      const project_info = appManager.get(ProjectManager).getProjectInfo();

      a.className = 'cm-md-link';
      a.innerText = link_data.title;
      a.onclick = (e) => {
        if (link_data.onClick) {
          e.preventDefault();
          e.stopPropagation();
          link_data.onClick(e);
        }
      };
      if (!link_data.href && project_info && link_data.id) {
        a.href = getProjectLinkHref(
          appManager.getRouter(),
          project_info,
          {
            name: 'project-asset-by-id',
            params: {
              assetId: link_data.id,
            },
          },
          true,
        );
      } else if (link_data.href) {
        a.href = link_data.href;
      }

      return a;
    },
    updateDOM: () => false,
  };
}

function getCachedAssetForAddress(
  address: WikiLinkAddress,
  appManager: IAppManager,
) {
  if (
    address.kind === 'asset' ||
    address.kind === 'assetHeader' ||
    address.kind === 'assetBlock'
  ) {
    return appManager
      .get(CreatorAssetManager)
      .getAssetShortViaCacheSync(address.assetId);
  }
  return undefined;
}

function isCursorInRange(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  return state.selection.ranges.some((range) => {
    return Math.max(from, range.from) <= Math.min(to, range.to);
  });
}

// Define a state effect to trigger a refresh of decorations
export const refreshDecorations = StateEffect.define<null>();

export const replacements = (config: PluginConfig): Extension[] => {
  function decorate(state: EditorState) {
    const widgets: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
      enter: ({ type, from, to }) => {
        if (type.name !== 'WikiLink') return;

        const rfrom = from + 2;
        const rto = to - 2;

        // Skip empty WikiLinks and those the cursor is inside.
        if (rto <= rfrom) return;
        if (isCursorInRange(state, from, to)) return;

        const wiki_link = state.sliceDoc(rfrom, rto);

        const parsed_wiki_link = parseWikiLink(wiki_link);
        if (parsed_wiki_link) {
          const address = parseLinkAddress(parsed_wiki_link.address);

          if (address.kind === 'title') {
            const widget = createWikiLinkWidget(
              {
                title: parsed_wiki_link.label || address.title,
                key: `title:${address.title}`,
                onClick: () =>
                  openAssetByTitle(config.appManager, address.title),
              },
              config.appManager,
            );
            widgets.push(Decoration.replace({ widget }).range(from, to));
            return;
          }

          if (address.kind === 'localHeader') {
            const widget = createWikiLinkWidget(
              {
                title: parsed_wiki_link.label || `#${address.anchor}`,
                key: `local:${address.anchor}`,
                href: `#${address.anchor}`,
              },
              config.appManager,
            );
            widgets.push(Decoration.replace({ widget }).range(from, to));
            return;
          }

          const cached_asset = getCachedAssetForAddress(
            address,
            config.appManager,
          );
          if (!cached_asset) return;

          const title: string =
            parsed_wiki_link.label ||
            cached_asset.title ||
            `Asset ${cached_asset.id}`;

          if (address.kind === 'assetBlock') {
            const widget = createWikiLinkWidget(
              {
                title,
                id: cached_asset.id,
                key: `asset:${cached_asset.id}`,
                address,
                onClick: () => openWikiLinkAddress(address, config.appManager),
              },
              config.appManager,
            );
            widgets.push(Decoration.replace({ widget }).range(from, to));
            return;
          }

          if (address.kind === 'assetHeader') {
            const widget = createWikiLinkWidget(
              {
                title,
                id: cached_asset.id,
                key: `asset:${cached_asset.id}#${address.anchor}`,
                address,
                onClick: () => openWikiLinkAddress(address, config.appManager),
              },
              config.appManager,
            );
            widgets.push(Decoration.replace({ widget }).range(from, to));
            return;
          }

          // kind === 'asset'
          const widget = createWikiLinkWidget(
            {
              title,
              id: cached_asset.id,
              key: `asset:${cached_asset.id}`,
              address,
              onClick: () => openWikiLinkAddress(address, config.appManager),
            },
            config.appManager,
          );
          widgets.push(Decoration.replace({ widget }).range(from, to));
          return;
        }

        // Legacy wiki links: `[[[title](#asset:id)]]` or `[[title]]`.
        const legacy_parsed = getLegacyCachedAssetFromString(
          wiki_link,
          config.appManager,
        );
        if (legacy_parsed && legacy_parsed.id) {
          const widget = createWikiLinkWidget(
            {
              title: legacy_parsed.title ?? `Asset ${legacy_parsed.id}`,
              id: legacy_parsed.id,
              key: `asset:${legacy_parsed.id}`,
              onClick: () =>
                config.appManager
                  .get(EditorManager)
                  .openAsset(legacy_parsed.id, 'popup'),
            },
            config.appManager,
          );
          widgets.push(Decoration.replace({ widget }).range(from, to));
          return;
        }

        // Plain `[[Asset title]]` — resolve the asset by title on click.
        const link_title = wiki_link.trim();
        if (!link_title) return;
        const widget = createWikiLinkWidget(
          {
            title: link_title,
            key: `title:${link_title}`,
            onClick: () => openAssetByTitle(config.appManager, link_title),
          },
          config.appManager,
        );
        widgets.push(Decoration.replace({ widget }).range(from, to));
      },
    });

    widgets.sort((a, b) => a.from - b.from);

    return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none;
  }

  const stateField = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state);
    },
    update(value, tr) {
      if (
        tr.docChanged ||
        tr.selection ||
        tr.effects.some((e) => e.is(refreshDecorations)) ||
        syntaxTree(tr.state) !== syntaxTree(tr.startState)
      ) {
        return decorate(tr.state);
      }
      return value.map(tr.changes);
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  type MissedAssetQuery = { kind: 'byId'; id: string };

  // ViewPlugin to handle async fetching
  const asyncFetcher = ViewPlugin.fromClass(
    class {
      private pending: Set<MissedAssetQuery> = new Set();

      constructor(private _view: EditorView) {}

      update(update: ViewUpdate) {
        const missingAssets = new Set<MissedAssetQuery>();
        const state = update.state;

        syntaxTree(state).iterate({
          enter: ({ type, from, to }) => {
            if (type.name !== 'WikiLink') return;
            if (from + 2 === to - 2) return;

            const wiki_link = state.sliceDoc(from + 2, to - 2);

            const parsed_wiki_link = parseWikiLink(wiki_link);
            if (parsed_wiki_link) {
              const address = parseLinkAddress(parsed_wiki_link.address);
              if (
                !(
                  address.kind === 'asset' ||
                  address.kind === 'assetHeader' ||
                  address.kind === 'assetBlock'
                )
              ) {
                return;
              }
              const cached_asset = config.appManager
                .get(CreatorAssetManager)
                .getAssetShortViaCacheSync(address.assetId);
              if (cached_asset === undefined) {
                missingAssets.add({ kind: 'byId', id: address.assetId });
              }
              return;
            }

            const cached_asset = getLegacyCachedAssetFromString(
              wiki_link,
              config.appManager,
            );
            const parsed_legacy = /^\[(.+?)\]\(#asset:([0-9a-f-]+)\)$/i.exec(
              wiki_link,
            );
            if (cached_asset === undefined && parsed_legacy) {
              missingAssets.add({ kind: 'byId', id: parsed_legacy[2] });
            }
          },
        });

        for (const asset_query of missingAssets) {
          if (this.pending.has(asset_query)) continue;
          this.pending.add(asset_query);

          config.appManager
            .get(CreatorAssetManager)
            .getAssetShortViaCache(asset_query.id)
            .then(() => {
              this.pending.delete(asset_query);
              this._view.dispatch({ effects: refreshDecorations.of(null) });
            })
            .finally(() => {
              this.pending.delete(asset_query);
            });
        }
      }
    },
  );

  return [
    stateField,
    asyncFetcher,
    EditorView.domEventHandlers({
      click(event, view) {
        const target = event.target as HTMLElement | null;
        const anchor = target?.closest('a[href^="#"]');
        if (!anchor) return false;
        const tag_id = decodeURIComponent(
          anchor.getAttribute('href')!.slice(1),
        );
        scrollToElementTag(view, tag_id);
        return true;
      },
    }),
  ];
};
