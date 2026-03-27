import type {
  DialogComponent,
  DialogGetAnswerProps,
  DialogGetCompProps,
  DialogHandler,
  DialogOpenerInstance,
} from '#logic/managers/DialogManager';
import DialogManager from '#logic/managers/DialogManager';
import {
  ProjectSubContext,
  type IProjectContext,
} from '#logic/types/IProjectContext';

export class DialogSubContext extends ProjectSubContext {
  declare projectContext: IProjectContext; // To fix TS errors in app projects

  // To fix TS errors in app projects
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(projectContext: IProjectContext) {
    super(projectContext);
  }

  // Показ диалога
  // component - компонент создаваемого диалога
  // dialog_state - объект состояния/параметров диалога
  // opener - компонент из которого был вызыван диалог (если не указан - глобальный диалог)
  create<
    Comp extends DialogComponent,
    CompAnswer extends DialogGetAnswerProps<InstanceType<Comp>['dialog']>,
    CompProps extends DialogGetCompProps<InstanceType<Comp>['dialog']>,
  >(component: Comp, state?: CompProps): DialogHandler<CompAnswer, Comp> {
    return this.projectContext.appManager
      .get(DialogManager)
      .create(component, state);
  }

  async show<
    Comp extends DialogComponent,
    CompAnswer extends DialogGetAnswerProps<InstanceType<Comp>['dialog']>,
    CompProps extends DialogGetCompProps<InstanceType<Comp>['dialog']>,
  >(
    component: Comp,
    state?: CompProps,
    opener?: DialogOpenerInstance,
  ): Promise<CompAnswer | undefined> {
    const dialog = this.create<Comp, CompAnswer, CompProps>(component, state);
    return await dialog.open(opener);
  }
}
