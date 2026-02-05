import { type UnwrapNestedRefs, reactive, watch } from 'vue';
import type { IAppManager } from '../managers/IAppManager';
import type { ResolvedAssetBlock, ResolvedAssetBlocks } from '../utils/assets';
import type {
  AssetForEdit,
  AssetFull,
  AssetPreviewInfo,
  AssetReferenceEntity,
  AssetShort,
} from './AssetsType';
import type { AssetBlockEntity } from './BlocksType';
import {
  type AssetPropValue,
  type AssetPropValueAsset,
  type AssetProps,
  castAssetPropValueToString,
  parseAssetNewBlockRef,
} from './Props';
import { AssetRights } from './Rights';
import type { AssetCommentDTO } from './CommentTypes';
import {
  BLOCK_NAME_META,
  COLLECTION_ADDED_GAME_LIST_ASSET_ID,
  COLLECTION_GAME_ASSET_ID,
  COLLECTION_PAGE_ASSET_ID,
  COLLECTION_PENDING_GAME_LIST_ASSET_ID,
  COLLECTION_README_ASSET_ID,
  GAME_INFO_ASSET_ID,
  TASK_ASSET_ID,
} from '../constants';
import {
  readAssetMetaCompletionBlockProps,
  type AssetCompletionMeta,
} from '../../components/Asset/Completion/AssetCompletion';

export type ComputedAssetPropResult = {
  value: AssetPropValue;
  state: boolean | string;
};

export type AssetFullInstanceR = UnwrapNestedRefs<AssetFullInstance>;

export function copyAssetFullData(asset: AssetFull) {
  return {
    ...asset,
    blocks: asset.blocks.map((block) => {
      return {
        ...block,
        props: {
          ...block.props,
        },
      };
    }),
  };
}

export function calcResolvedBlocks(asset: AssetForEdit) {
  const res: ResolvedAssetBlocks = {
    list: [],
    mapIds: {},
    mapNames: {},
    done: true,
  };

  for (const block of asset.blocks) {
    const resolved_block: ResolvedAssetBlock = {
      ...block,
      assetId: asset.id,
      rights: asset.rights,
      references: [],
    };

    if (
      asset.typeIds &&
      asset.typeIds.indexOf(TASK_ASSET_ID) >= 0 &&
      block.name === 'basic' &&
      block.type === 'props'
    ) {
      // TODO: get from server
      resolved_block.rights = AssetRights.READ_ONLY;
    } else if (
      asset.typeIds &&
      asset.typeIds.includes(COLLECTION_GAME_ASSET_ID)
    ) {
      resolved_block.rights = asset.rights;
      if (resolved_block.name === 'application-hint') {
        resolved_block.rights = AssetRights.READ_ONLY;
      } else if (resolved_block.id === '2d20ab92-5f19-442f-b06d-77a6260e1d4d') {
        resolved_block.rights = AssetRights.READ_ONLY;
      } else if (resolved_block.name === 'application-chat') {
        resolved_block.rights = AssetRights.COMMENT;
      }
    } else if (
      asset.typeIds &&
      asset.typeIds.includes(COLLECTION_PAGE_ASSET_ID)
    ) {
      resolved_block.rights = asset.rights;
      if (resolved_block.name === 'hint') {
        resolved_block.rights = AssetRights.READ_ONLY;
      }
    } else if (
      asset.typeIds &&
      (asset.typeIds.includes(COLLECTION_README_ASSET_ID) ||
        asset.typeIds.includes(COLLECTION_ADDED_GAME_LIST_ASSET_ID) ||
        asset.typeIds.includes(COLLECTION_PENDING_GAME_LIST_ASSET_ID))
    ) {
      resolved_block.rights = AssetRights.READ_ONLY;
    } else if (
      asset.typeIds &&
      asset.typeIds.includes(GAME_INFO_ASSET_ID) &&
      ['info', 'slider', 'links', 'description'].includes(
        resolved_block.name ?? '',
      )
    ) {
      resolved_block.rights = AssetRights.FILL_EMPTY;
    } else if (
      asset.id === TASK_ASSET_ID &&
      ['basic', 'info', 'comments'].includes(resolved_block.name ?? '')
    ) {
      resolved_block.rights = AssetRights.NO;
    } else {
      resolved_block.rights = asset.rights;
    }
    res.list.push(resolved_block);
    res.mapIds[resolved_block.id] = resolved_block;
    if (resolved_block.name) {
      res.mapNames[resolved_block.name] = resolved_block;
    }
  }

  for (const ref of asset.references) {
    if (!ref.sourceBlockId) continue;
    const b = res.mapIds.hasOwnProperty(ref.sourceBlockId)
      ? res.mapIds[ref.sourceBlockId]
      : null;
    if (!b) continue;
    b.references.push(ref);
  }

  res.list.sort((a, b) => a.index - b.index);

  return res;
}

export class AssetFullInstance implements AssetFull {
  readonly appManager: IAppManager;
  id!: string;
  projectId!: string;
  workspaceId!: string | null;
  parentIds!: string[];
  typeIds!: string[];
  name!: string | null;
  title!: string;
  icon!: string | null;
  isAbstract!: boolean;
  blocks!: AssetBlockEntity[];
  createdAt!: string;
  updatedAt!: string;
  deletedAt!: string | null;
  comments!: AssetCommentDTO[];
  creatorUserId!: string | null;
  rights!: number;
  ownTitle!: string | null;
  ownIcon!: string | null;
  index!: number | null;
  references!: AssetReferenceEntity[];
  lastViewedAt!: string | null;
  unread!: number;
  hasImage!: boolean;
  localName?: string;

  private _activated = false;
  private _resolvedBlocksComp = this._calcResolvedBlocks();

  get activated() {
    return this._activated;
  }

  get resolvedBlocks(): ResolvedAssetBlocks {
    return this._resolvedBlocksComp;
  }

  get rootReferences(): AssetReferenceEntity[] {
    const res: AssetReferenceEntity[] = [];
    for (const ref of this.references) {
      if (!ref.sourceBlockId) res.push(ref);
    }
    return res;
  }

  async resolveBlocks(): Promise<ResolvedAssetBlocks> {
    this.activate();
    if (this.resolvedBlocks.done) {
      return this.resolvedBlocks;
    }
    return new Promise<ResolvedAssetBlocks>((res) => {
      const stop = watch(
        () => this.resolvedBlocks,
        (rb) => {
          if (rb.done) {
            stop();
            res(this.resolvedBlocks);
          }
        },
      );
    });
  }

  static Create(appManager: IAppManager, asset: AssetFull): AssetFullInstanceR {
    return reactive(new AssetFullInstance(appManager, asset));
  }

  private constructor(appManager: IAppManager, asset: AssetFull) {
    this.appManager = appManager;
    this.update(asset);
  }

  update(asset: AssetFull) {
    this.id = asset.id;
    this.workspaceId = asset.workspaceId;
    this.projectId = asset.projectId;
    this.parentIds = asset.parentIds;
    this.typeIds = asset.typeIds;
    this.name = asset.name;
    this.title = asset.title ?? '';
    this.icon = asset.icon;
    this.isAbstract = asset.isAbstract;
    this.blocks = asset.blocks;
    this.createdAt = asset.createdAt;
    this.updatedAt = asset.updatedAt;
    this.deletedAt = asset.deletedAt;
    this.creatorUserId = asset.creatorUserId;
    this.hasImage = asset.hasImage;
    this.rights = asset.rights;
    this.ownIcon = asset.ownIcon;
    this.ownTitle = asset.ownTitle;
    this.references = asset.references;
    this.index = asset.index;
    this.comments = asset.comments;
    this.lastViewedAt = asset.lastViewedAt ?? null;
    this.unread = asset.unread ?? 0;
    this.localName = asset.localName;
    if (this.activated) {
      this._resolvedBlocksComp = this._calcResolvedBlocks();
    }
  }

  activate() {
    if (this._activated) {
      return;
    }
    this._activated = true;
    watch(
      () => this._calcResolvedBlocks(),
      (comp) => {
        this._resolvedBlocksComp = comp;
      },
      {
        immediate: true,
      },
    );
  }

  getBlockByRef(blockRef: string): ResolvedAssetBlock | null {
    this.activate();
    const parsed_ref = parseAssetNewBlockRef(blockRef);
    if (parsed_ref.blockId) {
      return this.resolvedBlocks.mapIds.hasOwnProperty(parsed_ref.blockId)
        ? this.resolvedBlocks.mapIds[parsed_ref.blockId]
        : null;
    }
    if (parsed_ref.blockName) {
      return this.resolvedBlocks.mapNames.hasOwnProperty(parsed_ref.blockName)
        ? this.resolvedBlocks.mapNames[parsed_ref.blockName]
        : null;
    }
    return null;
  }

  getBlockComputedProps(blockRef: string): AssetProps {
    const block = this.getBlockByRef(blockRef);
    return block ? block.computed : {};
  }

  getPropValue(
    blockRef: string,
    propKey: string,
    ownOnly = false,
  ): ComputedAssetPropResult {
    this.activate();
    if (!this.resolvedBlocks.done) {
      return {
        value: null,
        state: false,
      };
    }

    const block = this.getBlockByRef(blockRef);
    if (!block) {
      return {
        value: null,
        state: true,
      };
    }

    const props = ownOnly
      ? block.props
      : {
          ...block.inherited,
          ...block.props,
        };
    return this.computePropValue(blockRef, propKey, props[propKey]);
  }

  getComputedPropValue(
    blockRef: string,
    propKey: string,
  ): ComputedAssetPropResult {
    this.activate();
    if (!this.resolvedBlocks.done) {
      return {
        value: null,
        state: false,
      };
    }
    const block = this.getBlockByRef(blockRef);
    if (!block) {
      return {
        value: null,
        state: true,
      };
    }
    const val = block.computed[propKey];
    return {
      value: val,
      state: true,
    };
  }

  computePropValue(
    blockRef: string,
    propKey: string,
    val: AssetPropValue,
  ): ComputedAssetPropResult {
    this.activate();
    if (!this.resolvedBlocks.done) {
      return {
        value: null,
        state: false,
      };
    }
    return {
      value: val,
      state: true,
    };
  }

  async awaitPropValue<T extends AssetPropValue>(
    blockRef: string,
    propKey: string,
  ): Promise<T> {
    await this.resolveBlocks();
    return this.getPropValue(blockRef, propKey).value as T;
  }

  private _calcResolvedBlocks(): ResolvedAssetBlocks {
    const res: ResolvedAssetBlocks = {
      list: [],
      mapIds: {},
      mapNames: {},
      done: false,
    };
    if (!this._activated) {
      return res;
    }
    return calcResolvedBlocks(this);
  }

  convertToShort(): AssetShort {
    return {
      id: this.id,
      createdAt: this.createdAt,
      icon: this.icon,
      isAbstract: this.isAbstract,
      name: this.name,
      typeIds: this.typeIds,
      rights: this.rights,
      deletedAt: this.deletedAt,
      title: this.title,
      updatedAt: this.updatedAt,
      workspaceId: this.workspaceId,
      index: this.index,
      creatorUserId: this.creatorUserId,
      projectId: this.projectId,
      hasImage: this.hasImage,
      localName: this.localName,
    };
  }

  convertToPreviewInfo(): AssetPreviewInfo {
    let description: AssetPropValue = null;
    let mainImage: AssetPreviewInfo['mainImage'] = null;
    let completion: AssetCompletionMeta = {
      completeTrack: false,
      completeProgress: null,
      planMilestone: null,
      completeSet: null,
    };
    for (const block of this.blocks) {
      if (block.name === 'description') {
        description = block.computed['value'] ?? null;
      } else if (block.name === 'gallery') {
        if (block.computed['main\\value'] && block.computed['main\\type']) {
          mainImage = {
            type: castAssetPropValueToString(block.computed['main\\type']),
            value: block.computed['main\\value'],
          };
        }
      } else if (block.name === BLOCK_NAME_META) {
        completion = readAssetMetaCompletionBlockProps(block.computed);
      }
    }
    return {
      id: this.id,
      title: this.title,
      name: this.name,
      icon: this.icon,
      isAbstract: this.isAbstract,
      description,
      mainImage,
      rights: this.rights,
      ...completion,
    };
  }

  convertToFull(): AssetFull {
    return {
      id: this.id,
      projectId: this.projectId,
      workspaceId: this.workspaceId,
      parentIds: this.parentIds,
      typeIds: this.typeIds,
      name: this.name,
      title: this.title,
      icon: this.icon,
      isAbstract: this.isAbstract,
      blocks: this.blocks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      creatorUserId: this.creatorUserId,
      rights: this.rights,
      ownIcon: this.ownIcon,
      ownTitle: this.ownTitle,
      references: this.references,
      index: this.index,
      comments: this.comments,
      lastViewedAt: this.lastViewedAt,
      unread: this.unread,
      hasImage: this.hasImage,
      localName: this.localName,
    };
  }

  convertToAssetPropValue(): AssetPropValueAsset {
    return {
      AssetId: this.id,
      Name: this.name,
      Title: this.title,
    };
  }
}
