import type { VueI18n } from 'vue-i18n';
import {
  type AppManagerContext,
  AppSubManagerBase,
  type IAppManager,
} from './IAppManager';
import { v4 as uuidv4 } from 'uuid';
import type { LangStr } from '../types/ProjectTypes';
import type { ICookieContainer } from '../types/ICookieContainer';
import { reactive, unref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

export type UiFocusLockHandler = {
  unlock: () => Promise<void>;
  cancel: () => void;
};

type UiFocusLockHandlerHolder = {
  unlock: () => any;
  unlockPromise: Promise<any> | null;
  handler: UiFocusLockHandler;
};

export type UiNavigationGuardHandler = {
  cancel: () => void;
};

type UiNavigationGuardHandlerHolder = {
  check: () => boolean;
  pass: () => Promise<boolean> | boolean;
};

export enum ScreenSize {
  NONE = 'none',
  MB = 'mb',
  TB = 'tb',
  PC = 'pc',
  NOT_PC = 'not_pc',
  NOT_MB = 'not_mb',
  NOT_TB = 'not_tb',
}

const DEFAULT_COLOR_THEME = 'ims-dark';

export enum ToastTypes {
  INFO = 'info',
  SUCCESS = 'success',
  ERROR = 'error',
  PROGRESS = 'progress',
}

export type ProgressToastOptions = Partial<
  Pick<Toast, 'message' | 'abortController' | 'icon'>
> & { showDelay?: number };

export type ToastStateChange = Partial<
  Pick<Toast, 'message' | 'errors' | 'progress' | 'type' | 'icon'>
>;

export type DoTaskResult<T> =
  | {
      success: true;
      aborted: boolean;
      result: T;
      error: null;
    }
  | {
      success: false;
      aborted: boolean;
      result: null;
      error: Error;
    };

export class Toast {
  readonly id: string;
  message: string | null;
  type: ToastTypes;
  time: number;
  icon?: string;
  timeout: NodeJS.Timeout | null;
  progress: number | null | undefined = undefined;
  abortController?: AbortController;
  errors?: any[] = [];

  _unregister: () => void;

  constructor({
    message,
    type,
    time,
    abortController,
    errors,
    icon,
    unregister,
  }: {
    message?: string | null;
    successMessage?: string;
    type: ToastTypes;
    time?: number;
    icon?: string;
    abortController?: AbortController;
    errors?: any[];
    unregister: () => void;
  }) {
    this.id = uuidv4();
    this.message = message ?? null;
    this.type = type;
    this.time = time ? time : this.getDefaultToastTime(type, message);
    this.timeout = null;
    this.icon = icon;
    this.abortController = abortController;
    this.errors = errors;
    this._unregister = unregister;
  }

  getDefaultToastTime(type: ToastTypes, message: string | null = null) {
    return (
      (type === ToastTypes.ERROR ? 1000 : 0) +
      1800 +
      (message ? message.length : 0) * 15
    );
  }

  update(fields: ToastStateChange) {
    Object.assign(this, fields);
  }

  resume() {
    if (this.type === ToastTypes.PROGRESS && this.progress) return;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.close(), this.time);
  }

  pause() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }

  async close(abort?: boolean) {
    this.pause();
    if (
      abort &&
      this.abortController &&
      !this.abortController.signal.aborted &&
      this.progress
    ) {
      this.abortController.abort();
      await new Promise((res) => setTimeout(res, 1000));
    }
    this._unregister();
  }
}

export class UiPageNavigateState {
  private _loadResolve: ((res: boolean) => void) | null = null;
  loadPromise: Promise<boolean> = Promise.resolve(true);
  setLoadStart() {
    this.setLoadEnd(false);
    this.loadPromise = new Promise<boolean>((res) => {
      this._loadResolve = res;
    });
  }
  setLoadEnd(success: boolean) {
    if (this._loadResolve) {
      this._loadResolve(success);
      this._loadResolve = null;
    }
  }
}

export default class UiManager extends AppSubManagerBase {
  private focusLocks: UiFocusLockHandlerHolder[] = [];
  private navigationGuards: UiNavigationGuardHandlerHolder[] = [];
  private navigationBeforeUnloadHandler: ((event: Event) => void) | null = null;
  private _toasts: Toast[] = [];
  private themeChangeAllowed = true;

  public layout: any;
  public app: any;
  public screenSize: ScreenSize;

  $i18n: VueI18n | null = null;
  $cookies: ICookieContainer | null = null;
  private currentTheme = DEFAULT_COLOR_THEME;
  public pageNavigateState = new UiPageNavigateState();

  constructor(app_manager: IAppManager) {
    super(app_manager);
    this.layout = null;
    this.screenSize = ScreenSize.NONE;
  }
  async init(context: AppManagerContext) {
    this.$i18n = context.$i18n;
    this.$cookies = context.$cookies;

    if (this.$cookies) {
      const color_theme = this.$cookies.get('ims-theme');
      if (color_theme) this.currentTheme = color_theme;
    }
  }

  initClient() {
    this.handleResize(window.innerWidth);
  }

  getAllowThemeChange() {
    // const current_route = unref(this.appManager.getRouter().currentRoute);

    return this.themeChangeAllowed;
  }

  setAllowThemeChange(val: boolean) {
    this.themeChangeAllowed = val;
  }

  focusLock(unlock: () => any): UiFocusLockHandler {
    const focus_lock: UiFocusLockHandlerHolder = {
      unlock,
      unlockPromise: null,
      handler: {
        unlock: async () => {
          if (!focus_lock.unlockPromise) {
            focus_lock.unlockPromise = Promise.resolve()
              .then(() => unlock())
              .then(null, (err) => {
                console.error('UiManager unlock error', err);
              });
          }
          await focus_lock.unlockPromise;
          focus_lock.handler.cancel();
        },
        cancel: () => {
          const ind = this.focusLocks.indexOf(focus_lock);
          if (ind >= 0) this.focusLocks.splice(ind, 1);
        },
      },
    };
    this.focusLocks.push(focus_lock);
    return focus_lock.handler;
  }

  async blurActiveElement() {
    if (window.document.activeElement) {
      (window.document.activeElement as HTMLElement).blur();
    }
    const locks = [...this.focusLocks];
    for (const blur_task of locks) {
      await blur_task.handler.unlock();
    }
    this.focusLocks = [];
  }

  setAppInstance(app: any) {
    this.app = app;
  }

  setCurrentLayout(layout: any) {
    this.layout = layout;
  }

  handleResize(screenWidth: number) {
    if (screenWidth <= 480) this.screenSize = ScreenSize.MB;
    else if (screenWidth <= 960) this.screenSize = ScreenSize.TB;
    else this.screenSize = ScreenSize.PC;
  }

  isScreenSize(sz: ScreenSize): boolean {
    if (sz === ScreenSize.NOT_MB) {
      return (
        this.screenSize === ScreenSize.PC || this.screenSize === ScreenSize.TB
      );
    } else if (sz === ScreenSize.NOT_TB) {
      return (
        this.screenSize === ScreenSize.PC || this.screenSize === ScreenSize.MB
      );
    } else if (sz === ScreenSize.NOT_PC) {
      return (
        this.screenSize === ScreenSize.TB || this.screenSize === ScreenSize.MB
      );
    } else return this.screenSize === sz;
  }

  showError(error: any) {
    let error_str: string;
    if (error instanceof Error) error_str = error.message;
    else if (error && error.message) error_str = error.message;
    else
      error_str = error !== null && error !== undefined ? error.toString() : '';

    const new_toast = this._createToast({
      message: error_str,
      type: ToastTypes.ERROR,
      icon: 'ri-close-circle-fill',
    });

    new_toast.resume();
  }

  showSuccess(message: any) {
    const new_toast = this._createToast({
      message,
      type: ToastTypes.SUCCESS,
      icon: 'ri-checkbox-circle-fill',
    });

    new_toast.resume();
  }

  async showProgressToast<T>(
    progress_callback: (
      progress: (state: ToastStateChange) => void,
    ) => Promise<T>,
    options?: ProgressToastOptions,
  ): Promise<DoTaskResult<T>> {
    const showDelay = options?.showDelay ?? 300;
    let showTimeout: NodeJS.Timeout | null = null;
    let toast: Toast | null = null;
    let aborted = false;
    const toastSilentState: ToastStateChange = {
      errors: [],
      message: options?.message,
      icon: options?.icon,
      progress: null,
    };

    try {
      showTimeout = setTimeout(() => {
        toast = this._createToast({
          message: options?.message,
          type: ToastTypes.PROGRESS,
          icon: options?.icon,
          abortController: options?.abortController,
        });
      }, showDelay);

      const res = await progress_callback((state) => {
        if (toast) {
          toast.update(state);
        } else {
          Object.assign(toastSilentState, state);
        }
      });

      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }
      aborted = !!options?.abortController?.signal.aborted;

      if (toast) {
        const toastChecked = toast as Toast;
        if (toastChecked.progress && aborted) {
          toastChecked.update({
            message: this.appManager.$t('common.dialogs.stopped'),
            // progress: null,
          });
          toastChecked.resume();
        } else if (
          (toastChecked.type === ToastTypes.SUCCESS ||
            toastChecked.type === ToastTypes.ERROR) &&
          toastChecked.message
        ) {
          toastChecked.resume();
        } else {
          toastChecked.close();
        }
      } else if (
        toastSilentState.progress === null &&
        toastSilentState.message
      ) {
        if (toastSilentState.type === ToastTypes.ERROR) {
          this.showError(toastSilentState.message);
        } else {
          this.showSuccess(toastSilentState.message);
        }
      }
      return {
        success: true,
        aborted,
        result: res,
        error: null,
      };
    } catch (err: any) {
      if (showTimeout) clearTimeout(showTimeout);
      if (toast) {
        const toastChecked = toast as Toast;
        toastChecked.close();
      }
      this.showError(err);
      return {
        success: false,
        aborted,
        result: null,
        error: err,
      };
    }
  }

  async doTask<T>(func: () => Promise<T>): Promise<DoTaskResult<T>> {
    try {
      const result = await func();
      return { result, success: true, error: null, aborted: false };
    } catch (error: any) {
      this.showError(error);
      return { result: null, success: false, error, aborted: false };
    }
  }

  getToasts() {
    return this._toasts;
  }

  private _createToast({
    message,
    type,
    successMessage,
    icon,
    abortController,
  }: {
    message?: string | null;
    type: ToastTypes;
    successMessage?: string;
    icon?: string;
    abortController?: AbortController;
  }): Toast {
    const new_toast = reactive(
      new Toast({
        message,
        successMessage,
        type,
        icon,
        abortController,
        unregister: () => {
          const i = this._toasts.indexOf(new_toast);
          if (i >= 0) this._toasts.splice(i, 1);
        },
      }),
    );

    this._toasts.push(new_toast);

    return new_toast;
  }

  checkNavigationGuards() {
    for (const guard of this.navigationGuards) {
      if (!guard.check()) return false;
    }
    return true;
  }

  async passNavigationGuards(): Promise<boolean> {
    try {
      await this.blurActiveElement();
      for (const guard of this.navigationGuards) {
        if (!guard.check()) {
          const passed = await guard.pass();
          if (!passed) return false;
        }
      }
    } catch (err) {
      this.showError(err);
      return false;
    }
    return true;
  }

  setNavigationGuard(
    check: () => boolean,
    pass: () => Promise<boolean> | boolean,
  ): UiNavigationGuardHandler {
    const holder: UiNavigationGuardHandlerHolder = {
      check,
      pass,
    };
    this.navigationGuards.push(holder);

    if (
      this.navigationGuards.length === 1 &&
      !this.navigationBeforeUnloadHandler
    ) {
      this.navigationBeforeUnloadHandler = (event: Event) => {
        this.blurActiveElement(); // NOTE: don't await

        if (!this.checkNavigationGuards()) {
          event.preventDefault();
          // noinspection JSDeprecatedSymbols
          (event as any).returnValue = '';
        }
      };

      window.addEventListener(
        'beforeunload',
        this.navigationBeforeUnloadHandler,
      );
    }

    return {
      cancel: () => {
        const ind = this.navigationGuards.indexOf(holder);
        if (ind >= 0) this.navigationGuards.splice(ind, 1);

        if (
          this.navigationGuards.length === 0 &&
          this.navigationBeforeUnloadHandler
        ) {
          window.removeEventListener(
            'beforeunload',
            this.navigationBeforeUnloadHandler,
          );
          this.navigationBeforeUnloadHandler = null;
        }
      },
    };
  }

  getColorTheme(): string {
    if (!this.getAllowThemeChange()) return DEFAULT_COLOR_THEME;
    return this.currentTheme ?? DEFAULT_COLOR_THEME;
  }

  setColorTheme(theme: string) {
    this.currentTheme = theme;
    if (this.$cookies) {
      this.$cookies.set('ims-theme', theme, {
        expires: new Date(Date.now() + 1440 * 60 * 60 * 1000),
        path: '/',
        domain: this.appManager.$env.COOKIE_DOMAIN
          ? this.appManager.$env.COOKIE_DOMAIN
          : undefined,
      });
    }
  }

  getLanguage(): LangStr {
    const i18n_locale = this.$i18n ? unref(this.$i18n.locale) : null;
    if (i18n_locale) {
      const locale = i18n_locale.toLowerCase();
      if (locale === 'en' || locale.startsWith('en-')) return 'en';
      if (locale === 'ru' || locale.startsWith('ru-')) return 'ru';
    }
    return 'en';
  }

  protected async setLanguageSave(lang: string): Promise<void> {
    if (this.$cookies) {
      this.$cookies.set('lang', lang, {
        expires: new Date(Date.now() + 1440 * 60 * 60 * 1000),
        path: '/',
        domain: this.appManager.$env.COOKIE_DOMAIN
          ? this.appManager.$env.COOKIE_DOMAIN
          : undefined,
      });
    }
  }

  async setLanguage(lang: LangStr) {
    if (!this.$i18n) return;

    const new_lang = lang;
    await this.$i18n.setLocale(new_lang);

    let lang_code = 'en';
    if (lang === 'ru') lang_code = 'ru';
    await this.setLanguageSave(lang_code);
  }

  async openLink(to: RouteLocationRaw, new_tab = false) {
    if (typeof to === 'string' || new_tab) {
      const to_as_url =
        typeof to === 'string'
          ? to
          : this.appManager.getRouter().resolve(to).fullPath;
      if (new_tab) {
        window.open(to_as_url, '_blank');
      } else {
        window.location.assign(to_as_url);
      }
    } else {
      await this.appManager.getRouter().push(to);
    }
  }

  closePage() {
    window.location.assign('/');
  }

  async reloadPage() {
    window.location.assign(window.location.href);
  }

  async showUpgradeDialog(_feature?: string): Promise<boolean> {
    return false;
  }
}
