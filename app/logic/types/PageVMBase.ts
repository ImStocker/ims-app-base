import type { IAppManager } from '../managers/IAppManager';

export interface IPageVMBaseCtr<
  TParams extends object,
  T extends PageVMBase<TParams>,
> {
  new (appManager: IAppManager, params: TParams): T;
}

export abstract class PageVMBase<TParams extends object> {
  constructor(
    public appManager: IAppManager,
    protected _params: TParams,
  ) {}

  get params() {
    return this._params;
  }

  async setParams(params: TParams, force = false) {
    if (force || JSON.stringify(params) !== JSON.stringify(this._params)) {
      this._params = params;
      await this.load();
    }
  }

  abstract load(): Promise<void>;
  abstract toJSON(): Record<string, any>;
  abstract loadJSON(data: Record<string, any>): void;
}
