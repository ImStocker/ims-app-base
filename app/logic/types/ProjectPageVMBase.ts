import type { IProjectContext } from './IProjectContext';
import { PageVMBase } from './PageVMBase';

export interface IProjectPageVMBaseCtr<
  TParams extends object,
  T extends ProjectPageVMBase<TParams>,
> {
  new (projectContext: IProjectContext, params: TParams): T;
}

export abstract class ProjectPageVMBase<
  TParams extends object,
> extends PageVMBase<TParams> {
  constructor(
    public readonly projectContext: IProjectContext,
    params: TParams,
  ) {
    super(projectContext.appManager, params);
  }
}
