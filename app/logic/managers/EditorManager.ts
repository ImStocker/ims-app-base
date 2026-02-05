import type { BlockTypeDefinition } from '../types/BlockTypeDefinition';
import { EditorContextForAsset } from '../types/EditorContextForAsset';
import type { FieldTypeController } from '../types/FieldTypeController';
import CreatorAssetManager from './CreatorAssetManager';
import { AppSubManagerBase } from './IAppManager';
import { assert } from '../utils/typeUtils';
import type { Component } from 'vue';
import { defineAsyncComponent, markRaw, reactive, unref } from 'vue';
import type { IEditorVM } from '../vm/IEditorVM';
import { openProjectLink } from '../router/routes-helpers';
import ProjectManager from './ProjectManager';
import UiManager from './UiManager';
import DialogManager from './DialogManager';
import { makeAnchorTagId } from '../utils/assets';
import type { AssetPropValueFile } from '../types/Props';
import { getSrcByFileId } from '../utils/files';
import type { AssetFullInstanceR } from '../types/AssetFullInstance';

export interface UploadingJob {
  result: AssetPropValueFile | null | undefined;
  error: string | undefined;
  uploadId: string;
  progress: number;
  sentBytes: number;
  totalBytes: number;
  title: string;
  cancel(): void;
  awaitResult(): Promise<AssetPropValueFile | null>;
}

export type EditorContextForAssetRequested = {
  promise: Promise<EditorContextForAsset | null>;
  get: () => EditorContextForAsset | null | undefined;
  release: () => void;
};

export type AssetLayoutDescriptor = {
  name: string;
  pageComponent: Component;
  editorComponent: Component;
  props: {
    toolbarShowBlockCopyPaste?: boolean;
    headerLocaleButton?: boolean;
    headerPropsButton?: boolean;
    headerHideParent?: boolean;
  };
};

type EditorContextForAssetHolder = {
  promise: Promise<EditorContextForAsset | null>;
  context: EditorContextForAsset | null | undefined;
  requests: EditorContextForAssetRequested[];
};

export interface IEditorPageComponent {
  revealAssetBlock(blockId: string, anchor?: string): Promise<boolean>;
  get openedAssetId(): string | null;
}

const AssetLayoutDefault = markRaw({
  name: 'default',
  pageComponent: defineAsyncComponent(
    () => import('../../components/Asset/Layout/AssetDefaultPageLayout.vue'),
  ),
  editorComponent: defineAsyncComponent(
    () => import('../../components/Asset/Editor/AssetBlockEditor.vue'),
  ),
  props: {},
});

export default abstract class EditorManager extends AppSubManagerBase {
  private _blockTypeEntities: BlockTypeDefinition[] = [];
  private _fieldTypeEntities: FieldTypeController[] = [];
  private _assetLayoutDescriptors: AssetLayoutDescriptor[] = [
    AssetLayoutDefault,
  ];
  private _activeEditors: IEditorVM[] = [];
  private _currentEditorPage: IEditorPageComponent | null = null;
  private _assetLayoutBinds = new Map<string, string>();
  protected _uploadingJobs = new Map<string, UploadingJob>();

  private _editorContextsForAssets = new Map<
    string,
    EditorContextForAssetHolder
  >();

  private _registerEntity<
    T extends BlockTypeDefinition | FieldTypeController | AssetLayoutDescriptor,
  >(list: T[], entity: T) {
    list.push(entity);
    return {
      cancel: () => {
        const ind = list.indexOf(entity);
        if (ind >= 0) list.splice(ind, 1);
      },
    };
  }

  private _getEntitiesMap<
    T extends BlockTypeDefinition | FieldTypeController | AssetLayoutDescriptor,
  >(list: T[]) {
    const map: { [name: string]: T } = {};

    for (const element of list) {
      map[element.name] = element;
    }

    return map;
  }

  registerBlockType(blockType: BlockTypeDefinition) {
    return this._registerEntity(this._blockTypeEntities, blockType);
  }
  getBlockTypesList(): BlockTypeDefinition[] {
    return this._blockTypeEntities;
  }

  getBlockTypesMap() {
    return this._getEntitiesMap(this._blockTypeEntities);
  }

  getBlockTypeDefinition(name: string): BlockTypeDefinition | null {
    return this._blockTypeEntities.find((b) => b.name === name) ?? null;
  }

  getFieldTypesMap() {
    return this._getEntitiesMap(this._fieldTypeEntities);
  }

  registerFieldType(fieldType: FieldTypeController) {
    return this._registerEntity(this._fieldTypeEntities, fieldType);
  }
  getFieldTypesList(): FieldTypeController[] {
    return this._fieldTypeEntities;
  }

  requestEditorContextForAsset(
    assetId: string,
  ): EditorContextForAssetRequested {
    let exists_holder = this._editorContextsForAssets.get(assetId);
    if (!exists_holder) {
      exists_holder = reactive({
        context: undefined,
        requests: [],
        promise: (async () => {
          const asset = await this.appManager
            .get(CreatorAssetManager)
            .getAssetInstance(assetId);
          const context = asset
            ? EditorContextForAsset.CreateInstance(this.appManager, asset)
            : null;
          if (context) {
            await context.init();
          }
          assert(exists_holder);
          (exists_holder as EditorContextForAssetHolder).context = context;
          return context;
        })().catch((err) => {
          this._editorContextsForAssets.delete(assetId);
          throw err;
        }),
      }) as EditorContextForAssetHolder;
      this._editorContextsForAssets.set(assetId, exists_holder);
    }
    assert(exists_holder);

    const request: EditorContextForAssetRequested = {
      promise: exists_holder.promise,
      get: () => exists_holder.context,
      release: () => {
        const ind = exists_holder.requests.indexOf(request);
        if (ind >= 0) exists_holder.requests.splice(ind, 1);
        if (exists_holder.requests.length === 0) {
          if (exists_holder.context) {
            exists_holder.context.destroy();
          }
          this._editorContextsForAssets.delete(assetId);
        }
      },
    };
    exists_holder.requests.push(request);

    return request;
  }

  activateEditor(editor: IEditorVM) {
    this.deactivateEditor(editor);
    this._activeEditors.push(editor);
  }

  deactivateEditor(editor: IEditorVM) {
    const pos = this._activeEditors.indexOf(editor);
    if (pos >= 0) this._activeEditors.splice(pos, 1);
  }

  get activeEditor(): IEditorVM | null {
    return this._activeEditors.length > 0
      ? this._activeEditors[this._activeEditors.length - 1]
      : null;
  }

  set currentEditorPage(page: IEditorPageComponent | null) {
    this._currentEditorPage = page;
  }

  get currentEditorPage(): IEditorPageComponent | null {
    return this._currentEditorPage;
  }

  openAsset(
    assetId: string,
    target: 'self' | 'new-tab' | 'popup' = 'self',
    blockId?: string,
    anchor?: string,
  ): {
    opened: Promise<{ success: boolean; navigated: boolean }>;
    mounted: Promise<{ success: boolean; navigated: boolean }>;
    revealed: Promise<{
      success: boolean;
      navigated: boolean;
      revealed: boolean;
    }>;
  } {
    let opened: Promise<{ success: boolean; navigated: boolean }>;
    const project_info = this.appManager.get(ProjectManager).getProjectInfo();
    if (!project_info) {
      throw new Error('Project is not set');
    }
    if (target === 'popup') {
      opened = import('../../components/Asset/AssetPreviewDialog.vue').then(
        async (dialogComponent) => {
          const dialog = this.appManager
            .get(DialogManager)
            .create(dialogComponent.default, {
              assetId,
            });
          dialog.open();
          const [instance] = await Promise.all([
            dialog.getDialogInstance(),
            new Promise((r) => setTimeout(r, 500)), // Await for dialog appearing animation
          ]);
          instance.awaitMount();
          return {
            success: true,
            navigated: false,
          };
        },
      );
    } else if (target === 'self') {
      if (
        project_info &&
        (!this.currentEditorPage ||
          this.currentEditorPage.openedAssetId !== assetId)
      ) {
        opened = openProjectLink(this.appManager, project_info, {
          name: 'project-asset-by-id',
          params: {
            assetId: assetId,
          },
        }).then(() => {
          const router = this.appManager.getRouter();
          return {
            success:
              !!router.currentRoute &&
              unref(router.currentRoute).name === 'project-asset-by-id',
            navigated: true,
          };
        });
      } else {
        opened = Promise.resolve({
          success: true,
          navigated: false,
        });
      }
    } else {
      // it is if (target === 'new-tab')
      opened = openProjectLink(
        this.appManager,
        project_info,
        {
          name: 'project-asset-by-id',
          params: {
            assetId,
          },
          hash: blockId
            ? '#' + makeAnchorTagId(blockId, anchor ? anchor : undefined)
            : undefined,
        },
        true,
      ).then(() => {
        return {
          success: true,
          navigated: true,
        };
      });

      return {
        opened,
        mounted: opened,
        revealed: opened.then(() => {
          return {
            success: true,
            navigated: true,
            revealed: true,
          };
        }),
      };
    }

    const mounted = opened.then<{ success: boolean; navigated: boolean }>(
      async (opened_res) => {
        if (!opened_res.success) {
          return opened_res;
        }

        let editor_page = this.currentEditorPage;
        if (!editor_page || editor_page.openedAssetId !== assetId) {
          await this.appManager.get(UiManager).pageNavigateState.loadPromise;

          for (let attempt = 0; attempt < 10; attempt++) {
            if (this.currentEditorPage?.openedAssetId === assetId) {
              break;
            }
            await new Promise<void>((res) => setTimeout(res, 10));
          }
          editor_page = this.currentEditorPage;
          if (editor_page?.openedAssetId !== assetId) {
            return {
              ...opened_res,
              success: false,
            };
          }
        }

        return opened_res;
      },
    );

    const revealed = mounted.then<{
      success: boolean;
      navigated: boolean;
      revealed: boolean;
    }>(async (opened_res) => {
      if (!opened_res.success) {
        return {
          ...opened_res,
          revealed: false,
        };
      }

      if (!blockId) {
        return {
          ...opened_res,
          revealed: true,
        };
      }

      const editor_page = this.currentEditorPage;
      assert(editor_page);
      return {
        ...opened_res,
        revealed: await editor_page.revealAssetBlock(blockId, anchor),
      };
    });

    return {
      opened,
      mounted,
      revealed,
    };
  }

  private _revealedContentIds: string[] = [];
  private _revealedAssetId: string | null = null;

  revealBlockContentIds(assetId: string, blockId: string, item_ids: string[]) {
    this._revealedAssetId = assetId;
    this._revealedContentIds = item_ids.map(
      (item_id) => `${blockId}:${item_id}`,
    );
  }

  getRevealedContentIds(assetId: string): string[] | null {
    if (assetId !== this._revealedAssetId) return null;
    return this._revealedContentIds;
  }

  pickFiles(options?: {
    accept?: string;
    multiple?: boolean;
  }): Promise<{ blob: Blob; name: string }[] | null> {
    return new Promise<{ blob: Blob; name: string }[] | null>((resolve) => {
      const elem = document.createElement('input');
      elem.type = 'file';
      elem.style.display = 'none';
      window.document.body.appendChild(elem);
      elem.oncancel = () => {
        elem.remove();
        resolve(null);
      };
      if (options?.accept) {
        elem.accept = options.accept;
      }
      if (options?.multiple) {
        elem.multiple = true;
      }
      elem.onchange = async () => {
        elem.remove();
        if (elem.files && elem.files.length > 0) {
          resolve(
            [...elem.files].map((file) => ({ blob: file, name: file.name })),
          );
        } else {
          resolve(null);
        }
      };
      elem.click();
    });
  }

  abstract attachFile(_file: Blob, _name: string): UploadingJob;

  public async downloadAttachment(file: AssetPropValueFile) {
    const link = getSrcByFileId(this.appManager, file);
    const a = document.createElement('a');
    a.download = file.Title;
    a.href = link + '?download=1';
    a.target = '_blank';
    document.body.appendChild(a); // For Firefox
    a.click();
    setTimeout(() => {
      a.removeAttribute('href');
      a.remove();
    }, 1000);
  }

  getUploadJob(uploadId: string): UploadingJob | undefined {
    return this._uploadingJobs.get(uploadId);
  }

  registerAssetLayout(layout: AssetLayoutDescriptor) {
    return this._registerEntity(this._assetLayoutDescriptors, markRaw(layout));
  }

  registerAssetLayoutBind(assetId: string, layoutName: string) {
    this._assetLayoutBinds.set(assetId, layoutName);
    return {
      cancel: () => this._assetLayoutBinds.delete(assetId),
    };
  }

  getLayoutNameForAsset(asset: AssetFullInstanceR): string {
    const exact_asset = this._assetLayoutBinds.get(asset.id);
    if (exact_asset) {
      return exact_asset;
    }
    for (let i = asset.typeIds.length - 1; i >= 0; i--) {
      const type_asset = this._assetLayoutBinds.get(asset.typeIds[i]);
      if (type_asset) {
        return type_asset;
      }
    }
    return this.getDefaultLayoutDescriptor().name;
  }

  getLayoutDescriptor(layout: string): AssetLayoutDescriptor | null {
    return this._assetLayoutDescriptors.find((b) => b.name === layout) ?? null;
  }

  getDefaultLayoutDescriptor(): AssetLayoutDescriptor {
    return AssetLayoutDefault;
  }

  getLayoutDescriptorForAsset(
    asset: AssetFullInstanceR,
  ): AssetLayoutDescriptor {
    const layout = this.getLayoutNameForAsset(asset);
    const descriptor = this.getLayoutDescriptor(layout);
    return descriptor ? descriptor : this.getDefaultLayoutDescriptor();
  }
}
