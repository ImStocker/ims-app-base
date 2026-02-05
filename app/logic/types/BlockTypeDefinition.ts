import type { Component } from 'vue';
import {
  convertAssetPropValueTextOpsToStr,
  type AssetProps,
  type AssetPropValueText,
  type AssetPropValueType,
} from './Props';
import type { IAppManager } from '../managers/IAppManager';
import type {
  AssetLocalizableField,
  ResolvedAssetBlock,
} from '../utils/assets';
import type { PropsFormFieldDef } from './PropsForm';
import type { AssetFullInstanceR } from './AssetFullInstance';
import type { AssetChanger, BlockCursor } from './AssetChanger';
import Delta from 'quill-delta';
import {
  DefaultBlockEditorController,
  type BlockEditorController,
} from './BlockEditorController';

export type BlockContentItem<U> = {
  blockId: string;
  itemId: string;
  title: string;
  level?: number;
  anchor?: string;
  icon?: string;
  index?: number; // Todo: remove
  children?: BlockContentItem<U>[];
  selectable?: boolean;
  userData?: U;
};

export type BlockProvidedVariable = {
  title: string;
  name: string;
  dataType: AssetPropValueType[];
  blockId: string | null;
  blockName: string | null;
  field: PropsFormFieldDef;
};

export type BlockAiHandler = () => {
  makeAiPrompt(userPrompt: string): string;
  consumeAiText(str: string): string;
};

export abstract class BlockTypeDefinition {
  abstract name: string;
  abstract icon: string;
  abstract component: () => Promise<Component>;

  hideInAdding = false;
  hideBlockHeader = false;
  focusOnAdded = true;
  resizableBlockHeight = false;

  acceptAi = false;
  makeAiPrompt(userPrompt: string) {
    return userPrompt;
  }
  consumeAiText(
    assetChanger: AssetChanger,
    assetId: string,
    currentProps: AssetProps,
    blockCursor: BlockCursor,
    text: string,
  ): BlockCursor {
    const value = currentProps[blockCursor.blockKey];
    let new_value;
    const new_cursor = {
      ...blockCursor,
    };
    if (typeof value === 'string') {
      new_value =
        value.substring(0, blockCursor.offset) +
        text +
        value.substring(blockCursor.offset);
      new_cursor.offset += text.length;
    } else if (value && (value as AssetPropValueText).Ops) {
      const old_delta = new Delta((value as AssetPropValueText).Ops);
      const new_delta = old_delta.compose(
        new Delta().retain(blockCursor.offset).insert(text),
      );
      new_value = {
        Ops: new_delta,
        Str: convertAssetPropValueTextOpsToStr(new_delta.ops).str,
      };
      new_cursor.offset += text.length;
    } else {
      new_value = text;
      new_cursor.offset = text.length;
    }
    assetChanger.setBlockPropKey(
      assetId,
      blockCursor.blockRef,
      null,
      blockCursor.blockKey,
      new_value,
    );
    return new_cursor;
  }

  async beforeBlockCreate(
    appManager: IAppManager,
    params: { title: string | null },
  ): Promise<{ title: string | null; props?: AssetProps } | undefined> {
    return {
      title: params.title,
      props: undefined,
    };
  }

  getBlockProvidedVariables(
    _asset: AssetFullInstanceR,
    _resolved_block: ResolvedAssetBlock,
    _app_manager: IAppManager,
  ): BlockProvidedVariable[] {
    return [];
  }

  getBlockLocalizableFields(
    _asset: AssetFullInstanceR,
    _resolved_block: ResolvedAssetBlock,
  ): AssetLocalizableField[] {
    return [];
  }

  createController(
    appManager: IAppManager,
    getResolvedBlock: () => ResolvedAssetBlock | null,
  ): BlockEditorController {
    return new DefaultBlockEditorController(appManager, getResolvedBlock);
  }
}
