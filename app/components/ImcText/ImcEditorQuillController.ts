import type Quill from 'quill';
import type { IImcEditorComponent } from './IImcEditorComponent';
import { initQuillClientSide, type QuillInitedInterface } from './quill-init';
import { logicalTreeContains } from '../utils/logical-tree';
import type {
  ImcEditorModule,
  ImcEditorModuleOptions,
} from './ImcEditorModule';
import type { ImcLinkOption, ImcLinksModuleOptions } from './ImcLinksModule';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import ProjectManager from '../../logic/managers/ProjectManager';
import Delta from 'quill-delta';
import type { ImcAssetBlotData } from './blots/ImcAssetBlot';
import UiManager from '../../logic/managers/UiManager';
import { assert } from '../../logic/utils/typeUtils';
import hljs from 'highlight.js';
import { ImcTextCodeLangs } from './imc-text-code-langs';
import EditorManager from '../../logic/managers/EditorManager';

export class ImcEditorQuillController {
  editorElement: HTMLElement | null = null;
  quill: Quill | null = null;
  quillInitedInterface: QuillInitedInterface | null = null;

  private _editorElementPromise: Promise<HTMLElement>;
  private _editorElementResolve!: (e: HTMLElement) => void;
  private _initPromise: Promise<void> | null = null;

  constructor(public component: IImcEditorComponent) {
    this._editorElementPromise = new Promise((resolve) => {
      this._editorElementResolve = resolve;
    });
  }

  async awaitQuill(): Promise<Quill> {
    await this.init();
    assert(this.quill);
    return this.quill;
  }

  async init() {
    if (!this._initPromise) {
      this._initPromise = Promise.resolve().then(async () => {
        const [editorElement, quillInitedInterface] = await Promise.all([
          this._editorElementPromise,
          await initQuillClientSide(),
        ]);
        this.quillInitedInterface = quillInitedInterface;

        const { Quill, ImcEditorModule } = await initQuillClientSide();
        const quill = new Quill(editorElement, {
          theme: 'imcbuble',
          placeholder: this.component.placeholder,
          modules: {
            syntax: { hljs, languages: ImcTextCodeLangs },
            imceditor: {
              getComponent: () => this.component,
            } as ImcEditorModuleOptions,
            imclinks: {
              loadOptions: (type, query) => this._loadOptions(type, query),
              dropdown: this.component.dropdownInterface,
            } as ImcLinksModuleOptions,
            keyboard: {
              bindings: ImcEditorModule.GetKeyboardBindings(),
            },
            toolbar: [],
          },
        });

        if (this.component.maxHeight) {
          quill.root.style.maxHeight = `${this.component.maxHeight}px`;
          quill.root.style.overflow = 'hidden auto';
        }

        this.quill = quill;

        quill.on('editor-change', (eventName) => {
          if (eventName === 'text-change') {
            this.component.onTextChange(quill.getContents());
          } else if (eventName === 'selection-change') {
            const imceditor = quill.getModule('imceditor') as ImcEditorModule;
            if (!imceditor) return;

            const selection = quill.getSelection();

            const shoud_be_focused = this.shouldBeFocused();
            const is_focused = this.component.isFocused();
            if (shoud_be_focused && !is_focused) {
              this.component.onFocus();
            }

            if (selection) {
              if (selection.length > 0) {
                const bounds = quill.getBounds(
                  selection.index,
                  selection.length,
                );
                if (bounds) {
                  this.component.toolbarCoord = new DOMRect(
                    bounds.left,
                    bounds.top,
                    bounds.width,
                    bounds.height,
                  );
                }
              } else {
                this.component.toolbarCoord = null;
              }
            }
          }
        });

        this._initEditorContent(quill);

        quill.history.clear();

        quill.root.addEventListener(
          'paste',
          (e) => {
            const clipboardData =
              e.clipboardData || (window as any).clipboardData;

            const isImage =
              clipboardData.types.length &&
              clipboardData.types.join('').includes('Files');
            if (!isImage) return;

            e.preventDefault();
            this.handleFile(e);
          },
          true,
        );
      });
    }
    return await this._initPromise;
  }

  shouldBeFocused() {
    if (!this.quill) return false;
    const imceditor = this.quill.getModule('imceditor') as ImcEditorModule;
    if (!imceditor) return false;
    return (
      this.quill.hasFocus() ||
      (window.document.activeElement &&
        this.component.$el &&
        logicalTreeContains(
          this.component.$el,
          window.document.activeElement,
        )) ||
      imceditor.modalPromises.length > 0
    );
  }

  onEditorElementMounted(editorElement: HTMLElement) {
    this.editorElement = editorElement;
    this._editorElementResolve(this.editorElement);
  }

  destroy() {
    if (this.quill) {
      if (this.quill.theme && (this.quill.theme as any).destroy) {
        (this.quill.theme as any).destroy();
      }
      this.quill = null;
    }
  }

  private _initEditorContent(quill: Quill) {
    const content = this.component.quillContent;
    if (!content) return;

    let _any_changed = false;
    const new_content = new Delta();
    for (const op of content.ops) {
      if (op.insert && (op.insert as any)['upload-job']) {
        const upload_job = this.component
          .$getAppManager()
          .get(EditorManager)
          .getUploadJob((op.insert as any)['upload-job'].uploadId);
        if (!upload_job || upload_job.result === null || upload_job.error) {
          _any_changed = true;
          continue;
        }
      } else if (
        op.attributes &&
        op.attributes.asset &&
        (op.attributes.asset as ImcAssetBlotData).value?.AssetId
      ) {
        const asset = this.component
          .$getAppManager()
          .get(CreatorAssetManager)
          .getAssetShortViaCacheSync(
            (op.attributes.asset as ImcAssetBlotData).value?.AssetId,
          );
        if (
          asset &&
          asset.title !==
            (op.attributes.asset as ImcAssetBlotData).value?.Title &&
          asset.title
        ) {
          const new_asset_attr: ImcAssetBlotData = {
            value: {
              AssetId: asset.id,
              Title: asset.title,
              Name: asset.name,
              BlockId: (op.attributes.asset as ImcAssetBlotData).value?.BlockId,
              Anchor: (op.attributes.asset as ImcAssetBlotData).value?.Anchor,
            },
          };
          if (asset.icon) {
            new_asset_attr.icon = asset.icon;
          }
          new_content.push({
            insert: asset.title,
            attributes: {
              ...op.attributes,
              asset: new_asset_attr,
            },
          });
          _any_changed = true;
        } else new_content.push(op);
      } else new_content.push(op);
    }

    quill.setContents(new_content);
  }

  private async _loadOptions(
    type: 'asset' | 'mention',
    query: string,
  ): Promise<{ list: ImcLinkOption[]; more: boolean }> {
    if (type === 'mention') {
      return {
        list: [],
        more: false,
      };
    }

    const take_count = 10;
    const gather: (() => Promise<ImcLinkOption[]>)[] = [];

    let has_more = false;
    gather.push(async () => {
      const assets = await this.component
        .$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortsList({
          where: {
            query: query,
            workspaceids: this.component
              .$getAppManager()
              .get(ProjectManager)
              .getWorkspaceIdByName('gdd'),
          },
          count: take_count + 1,
        });
      has_more = has_more || assets.list.length > take_count;
      return assets.list.slice(0, take_count).map((a) => {
        return {
          type: 'asset',
          title: a.title,
          value: a.id,
          raw: a,
        } as ImcLinkOption;
      });
    });

    return {
      list: ([] as ImcLinkOption[]).concat.apply(
        [],
        await Promise.all(gather.map((g) => g())),
      ),
      more: has_more,
    };
  }

  handleFile(e: any) {
    const quill = this.quill;
    if (!quill) return;

    let files: File[];
    if (e.target && e.target.files) {
      files = [...e.target.files];
      e.target.value = null;
    } else if (e.dataTransfer && e.dataTransfer.files)
      files = [...e.dataTransfer.files];
    else if (e.clipboardData && e.clipboardData.files)
      files = [...e.clipboardData.files];
    else files = [];

    for (const file of files) {
      const pos = quill.getSelection()?.index ?? 0;
      const upload_job = this.component
        .$getAppManager()
        .get(EditorManager)
        .attachFile(file, file.name);

      quill.insertEmbed(pos, 'upload-job', {
        uploadId: upload_job.uploadId,
        inline: /^image\//.test(file.type),
      });
      quill.setSelection(pos + 1, 0);
      upload_job.awaitResult().then(
        () => this._materializeFiles(),
        (err) => this.component.$getAppManager().get(UiManager).showError(err),
      );
    }
  }

  private async _materializeFiles() {
    const content = this.component.quillContent;
    if (!content) return;
    let any_changed = false;
    const new_content = new Delta();
    for (const op of content.ops) {
      if (op.insert && (op.insert as any)['upload-job']) {
        const upload_job = this.component
          .$getAppManager()
          .get(EditorManager)
          .getUploadJob((op.insert as any)['upload-job'].uploadId);
        if (!upload_job || upload_job.result === null || upload_job.error) {
          any_changed = true;
          continue;
        }
        if (upload_job.result) {
          any_changed = true;
          new_content.push({
            insert: {
              file: {
                value: upload_job.result,
                inline: !!(op.insert as any)['upload-job'].inline,
              },
            },
          });
        } else {
          new_content.push(op);
        }
      } else new_content.push(op);
    }
    if (any_changed) {
      this.setContentSilently(new_content);
      this.component.onTextChange(new_content);
    }
  }

  public setContentSilently(new_content: Delta) {
    if (this.quill) {
      const selection = this.quill.getSelection(false);
      this.quill.setContents(new_content, 'silent');
      if (selection) this.quill.setSelection(selection);
    }
  }
}
