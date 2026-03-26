import type { IAppManager } from '#logic/managers/IAppManager';
import { assert } from '#logic/utils/typeUtils';
import { reactive } from 'vue';
import {
  ProjectSubContext,
  type IProjectContext,
  type ProjectSubContextCtr,
} from './IProjectContext';

import type { ProjectFullInfo, UserInProject } from './ProjectTypes';

type StateRoutine = {
  key: string;
  save: () => Record<string, any>;
  load: (state: Record<string, any>) => void;
};

export class ProjectContext implements IProjectContext {
  private _registeredSubContexts = new Map<
    ProjectSubContextCtr<any>,
    ProjectSubContext
  >();
  private readonly _initRoutines: (() => Promise<void>)[] = [];
  private readonly _postInitRoutines: (() => Promise<void>)[] = [];
  private readonly _destroyRoutines: (() => Promise<void>)[] = [];
  private readonly _stateRoutines: StateRoutine[] = [];
  private _inited: boolean = false;

  constructor(
    private readonly _appManager: IAppManager,
    private readonly _projectInfo: ProjectFullInfo,
    private readonly _user: UserInProject | null,
  ) {}

  get appManager(): IAppManager {
    return this._appManager;
  }
  get projectInfo(): ProjectFullInfo {
    return this._projectInfo;
  }
  get user(): UserInProject | null {
    return this._user;
  }
  get<R extends T, T extends ProjectSubContext = ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
  ): R {
    const subcontext = this._registeredSubContexts.get(subcontext_interface);
    assert(subcontext, 'Project sub context not registered');
    return subcontext as R;
  }

  register<T extends ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T>,
    subcontext: T,
  ): void;
  register<T extends ProjectSubContext>(subcontext: T): void;

  register<T extends ProjectSubContext>(
    subcontext_interface: ProjectSubContextCtr<T> | T,
    subcontext?: T,
  ): void {
    let manager_id;
    if (subcontext_interface instanceof ProjectSubContext) {
      manager_id = subcontext_interface.constructor;
      subcontext = subcontext_interface;
    } else manager_id = subcontext_interface;
    assert(subcontext, 'Manager is undefined');
    this._registeredSubContexts.set(
      manager_id,
      reactive(subcontext) as unknown as ProjectSubContext,
    );
  }

  addInitRoutine(init: () => Promise<void>) {
    this._initRoutines.push(init);
  }

  addPostInitRoutine(init: () => Promise<void>) {
    this._postInitRoutines.push(init);
  }

  addDestroyRoutine(destroy: () => Promise<void>) {
    this._destroyRoutines.push(destroy);
  }

  addStateRoutine(routine: StateRoutine) {
    this._stateRoutines.push(routine);
  }

  async init() {
    if (this._inited) {
      return;
    }

    for (const init of this._initRoutines) {
      await init();
    }

    this._inited = true;
  }

  resetInit() {
    this._inited = false;
  }

  async destroy() {
    if (!this._inited) {
      return;
    }

    for (const destroy of this._destroyRoutines) {
      await destroy();
    }

    this._inited = false;
  }

  saveState(): Record<string, any> {
    const res = {};
    for (const routine of this._stateRoutines) {
      res[routine.key] = routine.save();
    }
    return res;
  }

  loadState(state: Record<string, any>) {
    for (const routine of this._stateRoutines) {
      routine.load(state.hasOwnProperty(routine.key) ? state[routine.key] : {});
    }
  }
}
