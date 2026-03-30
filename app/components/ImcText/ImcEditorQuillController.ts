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
import type { ImcClipboard } from './ImcClipboard';
import TaskManager from '../../logic/managers/TaskManager';
import { AssetPropWhereOpKind } from '../../logic/types/PropsWhere';
import { TASK_ASSET_ID } from '../../logic/constants';
import type { TaskEntity } from '../../logic/types/BoardTypes';

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

        (quill.getModule('clipboard') as ImcClipboard).controller = this;

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
    type: ImcLinkOption['type'],
    query: string,
  ): Promise<{ list: ImcLinkOption[]; more: boolean }> {
    const take_count = 10;
    const gather: (() => Promise<ImcLinkOption[]>)[] = [];

    let prepared_query: any = query;

    let has_more = false;

    if (parseInt(query)) {
      prepared_query = {
        op: AssetPropWhereOpKind.OR,
        v: [
          {
            query: query,
          },
          {
            'basic|num': {
              op: AssetPropWhereOpKind.LIKE,
              v: query,
            },
          },
        ],
      };
    }

    gather.push(async () => {
      const assets = await this.component
        .$getAppManager()
        .get(CreatorAssetManager)
        .getAssetShortsList({
          where: {
            query: prepared_query,
            'info|archivedat': {
              op: AssetPropWhereOpKind.EQUAL,
              v: null,
            },
            workspaceids: [
              this.component
                .$getAppManager()
                .get(ProjectManager)
                .getWorkspaceIdByName('gdd'),
              this.component
                .$getAppManager()
                .get(ProjectManager)
                .getWorkspaceIdByName('discussions'),
              this.component
                .$getAppManager()
                .get(ProjectManager)
                .getWorkspaceIdByName('tasks'),
            ],
          },
          count: take_count + 1,
        });

      const task_ids: string[] = [];
      for (const asset_short of assets.list) {
        if (asset_short.typeIds.includes(TASK_ASSET_ID)) {
          task_ids.push(asset_short.id);
        }
      }
      let tasks: TaskEntity[] = [];
      if (task_ids.length) {
        tasks = (
          await this.component
            .$getAppManager()
            .get(TaskManager)
            .getTasks({
              where: {
                id: task_ids,
              },
            })
        ).list;
      }

      const asset_options = assets.list.map((a) => {
        let title = a.title;
        let type = 'asset';
        if (task_ids.includes(a.id)) {
          const task = tasks.find((t) => t.id === a.id);
          if (task) {
            title = `#${task.num}`;
            type = 'task';
          }
        }
        return {
          type,
          title,
          value: a.id,
          raw: a,
        } as ImcLinkOption;
      });

      let user_options: ImcLinkOption[] = [];
      if (type === 'user') {
        const users = await this.component
          .$getAppManager()
          .get(ProjectManager)
          .getMembersList();

        user_options = users.list
          .filter((m) => m.name.includes(query))
          .map((m) => {
            return {
              type: 'user',
              title: m.name,
              value: m.id.toString(),
              raw: m,
            } as ImcLinkOption;
          });
      }

      const res_user_options = user_options.slice(0, take_count);
      const remaining_slots = take_count - res_user_options.length;

      const res_asset_options = asset_options.slice(0, remaining_slots);
      const res = [...res_user_options, ...res_asset_options];

      has_more = asset_options.length > res_asset_options.length;
      return res;
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
        () => this.materializeFiles(),
        (err) => this.component.$getAppManager().get(UiManager).showError(err),
      );
    }
  }

  async materializeFiles() {
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
