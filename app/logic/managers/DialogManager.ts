import { markRaw } from 'vue';
import { AppSubManagerBase, type IAppManager } from './IAppManager';
import { assert } from '../utils/typeUtils';
import UiManager from './UiManager';

let dialog_id_counter = 0;

type DialogCloseStatus = {
  value: any;
  cancel: boolean;
};

type OpenerInstance = { $el: HTMLElement | null };

export type DialogInterface<Props, Answer> = {
  state: Props;
  close: (res?: Answer, force?: boolean) => void;
};

type DialogComponent = abstract new (...args: any) => any;

export type DialogHandler<T, Comp extends DialogComponent> = {
  open: (opener?: OpenerInstance) => Promise<T | undefined>;
  close: (res?: T, force?: boolean) => Promise<boolean>;
  getDialogInstance: () => Promise<InstanceType<Comp>>;
};

export class Dialog {
  id: number;
  component: DialogComponent;
  state: Record<string, any>;
  ready = false;
  busy = false;
  pendingClose = false;
  dialogComponentInstance: any = null;
  opener: OpenerInstance | null = null;
  mountPromise: Promise<void>;
  private _mountPromiseResolve!: () => void;

  // parameters
  // Устанавливаются с помощью эмита события "dialog-parameters" в компоненте диалога
  // .forbidClose - если true, диалог нельзя закрыть кликом вне диалога, только с помощью функции close
  // .beforeClose - массив методов, которык вызываются перед закрытием.
  //                Принимает значение, переданное в close и признак force (закрыть диалог несмотря на результат beforeClose)
  //                Должен вовзвратить true - подтвердить закрыте, false - отменить (может вернуть промис)
  // .defaultCloseValue - значение диалога при нажатии на крестик
  parameters: any = {};

  private _unregister: (dialog: Dialog, value: any) => void;
  appManager: IAppManager;

  constructor({
    id,
    component,
    state,
    unregister,
    appManager,
  }: {
    id: number;
    component: DialogComponent;
    state: any;
    unregister: (dialog: Dialog, value: any) => void;
    appManager: IAppManager;
  }) {
    this.id = id;
    this.component = component;
    this.state = state;
    this._unregister = unregister;
    this.appManager = appManager;
    this.mountPromise = new Promise((res) => {
      this._mountPromiseResolve = res;
    });
  }

  // Закрытие диалога
  // value - значение диалога
  //
  close(value: any, force = false): Promise<boolean> {
    const callBeforeClose = (
      i: number,
      close_status: DialogCloseStatus,
      force: boolean,
    ): any => {
      if (i >= this.parameters.beforeClose.length) return;

      return Promise.resolve()
        .then(() => {
          return this.parameters.beforeClose[i](close_status, force);
        })
        .then(() => {
          return callBeforeClose(i + 1, close_status, force);
        });
    };

    const close_status = {
      value: value,
      cancel: false,
    };
    return Promise.resolve()
      .then(async () => {
        await this.appManager.get(UiManager).blurActiveElement();
        if (this.parameters.beforeClose) {
          await callBeforeClose(0, close_status, force);
        }
      })
      .then(null, (err) => {
        if (force) {
          console.error(err);
          return; // Все равно закрыть диалог
        } else throw err;
      })
      .then(() => {
        if (!close_status.cancel || force) {
          this._unregister(this, close_status.value);
          return true;
        }
        return false; // Cancelled
      });
  }

  onDialogMounted(instance: any) {
    this.dialogComponentInstance = instance;
    this._mountPromiseResolve();
  }
}

type GetCompProps<Comp> =
  Comp extends DialogInterface<infer T, any> ? T : never;
type GetAnswerProps<Comp> =
  Comp extends DialogInterface<any, infer T> ? T : never;

export default class DialogManager extends AppSubManagerBase {
  public readonly dialogs: Dialog[];
  public dialogHost: any;

  constructor(app_manager: IAppManager) {
    super(app_manager);
    this.dialogs = [];
  }

  // Показ диалога
  // component - компонент создаваемого диалога
  // dialog_state - объект состояния/параметров диалога
  // opener - компонент из которого был вызыван диалог (если не указан - глобальный диалог)
  create<
    Comp extends DialogComponent,
    CompAnswer extends GetAnswerProps<InstanceType<Comp>['dialog']>,
    CompProps extends GetCompProps<InstanceType<Comp>['dialog']>,
  >(component: Comp, state?: CompProps): DialogHandler<CompAnswer, Comp> {
    if (!state) state = {} as CompProps;

    let handler: DialogHandler<CompAnswer, Comp>;

    const promise = new Promise<CompAnswer | undefined>((resolve) => {
      const dialog = new Dialog({
        id: ++dialog_id_counter,
        component: markRaw(component),
        state: state,
        unregister: (dialog, value) => {
          const i = this.dialogs.indexOf(dialog);
          if (i >= 0) this.dialogs.splice(i, 1);
          resolve(value);
        },
        appManager: this.appManager,
      });

      handler = {
        open: async (opener?: OpenerInstance) => {
          // Если указан компонент, от чьего имени открывается диалоговое окно, нужно найти соответвующий DOM элемент
          // и вставить диалог после него
          let which_dialog: Dialog | undefined = undefined;
          dialog.opener = opener ?? null;

          if (opener) {
            // Пытаемся найти opener среди диалогов
            which_dialog = this.dialogs.find(
              (d) => d.dialogComponentInstance === opener,
            );
          }
          /// opener && this.dialogHost ? this.dialogHost.whichDialog(opener) : null;

          // Вставка нового диалога
          if (which_dialog) {
            const i = this.dialogs.indexOf(which_dialog);
            if (i >= 0) this.dialogs.splice(i + 1, 0, dialog);
            else which_dialog = undefined;
          }
          if (!which_dialog) this.dialogs.push(dialog);
          const res = await promise;
          return res;
        },
        close: (value?: CompAnswer, force = false) =>
          dialog.close(value, force),
        async getDialogInstance() {
          await dialog.mountPromise;
          return dialog.dialogComponentInstance;
        },
      };
    });

    // @ts-expect-error: handler is really assigned
    assert(handler);

    return handler;
  }

  async show<
    Comp extends DialogComponent,
    CompAnswer extends GetAnswerProps<InstanceType<Comp>['dialog']>,
    CompProps extends GetCompProps<InstanceType<Comp>['dialog']>,
  >(
    component: Comp,
    state?: CompProps,
    opener?: OpenerInstance,
  ): Promise<CompAnswer | undefined> {
    const dialog = this.create<Comp, CompAnswer, CompProps>(component, state);
    return await dialog.open(opener);
  }
}
