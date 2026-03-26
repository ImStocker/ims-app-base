import type { InjectionKey } from 'vue';
import type { IAppManager } from '../managers/IAppManager';
import type { ProjectFullInfo, UserInProject } from './ProjectTypes';

export const injectedProjectContext: InjectionKey<IProjectContext> =
  Symbol('projectContext');

export abstract class ProjectSubContext {
  public readonly projectContext: IProjectContext;

  constructor(projectContext: IProjectContext) {
    this.projectContext = projectContext;
  }
}

export type ProjectSubContextCtr<T extends ProjectSubContext> = abstract new (
  projectContext: IProjectContext,
  ...otherArgs: any[]
) => T;

export interface IProjectContext {
  get appManager(): IAppManager;
  get projectInfo(): ProjectFullInfo;
  get user(): UserInProject | null;

  get<R extends T, T extends ProjectSubContext = ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
  ): R;

  register<T extends ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
    subcontext: T,
  ): void;
  register<T extends ProjectSubContext>(subcontext: T): void;

  init(): Promise<void>;
  destroy(): Promise<void>;
  saveState(): Record<string, any>;
  loadState(state: Record<string, any>): void;
}
