type WorkspaceHistoryRecord = {
  redo: (data: Record<string, any>) => any;
  undo: (data: Record<string, any>) => any;
  data: Record<string, any>;
};

export class WorkspaceChanger {
  private _history: WorkspaceHistoryRecord[] = [];
  private _historyPointer = 0;
  private _historyUndoRedoBusy = false as 'undo' | 'redo' | false;
  private _historyLastUndoRedoJob: Promise<void> = Promise.resolve();

  getHasChanges(): boolean {
    return false;
  }

  isSaving(): boolean {
    return false;
  }

  isUndoRedoBusy(): false | 'undo' | 'redo' {
    return this._historyUndoRedoBusy;
  }

  canUndo(): boolean {
    return this._historyPointer > 0;
  }

  canRedo(): boolean {
    return this._historyPointer < this._history.length;
  }

  async undo(): Promise<void> {
    if (!this.canUndo()) {
      return;
    }
    const job = this._historyLastUndoRedoJob.then(async () => {
      this._historyUndoRedoBusy = 'undo';
      try {
        const new_p = this._historyPointer - 1;
        await this._history[new_p].undo(this._history[new_p].data);
        this._historyPointer = new_p;
      } finally {
        this._historyUndoRedoBusy = false;
      }
    });
    this._historyLastUndoRedoJob = job.then(null, (_err) => {});
    return await job;
  }

  async redo(): Promise<void> {
    if (!this.canRedo()) {
      return;
    }
    const job = this._historyLastUndoRedoJob.then(async () => {
      this._historyUndoRedoBusy = 'redo';
      try {
        const new_p = this._historyPointer + 1;
        await this._history[new_p - 1].redo(this._history[new_p - 1].data);
        this._historyPointer = new_p;
      } finally {
        this._historyUndoRedoBusy = false;
      }
    });
    this._historyLastUndoRedoJob = job.then(null, (_err) => {});
    return await job;
  }

  async saveChanges(): Promise<boolean> {
    return false;
  }

  async executeHistoryTask(
    task: (
      data: Record<string, any>,
    ) => Promise<(data: Record<string, any>) => Promise<any>>,
  ) {
    const record: WorkspaceHistoryRecord = {
      redo: async (data) => {
        record.undo = await task(data);
      },
      undo: () => {},
      data: {},
    };
    await record.redo(record.data);
    this._history = this._history.slice(0, this._historyPointer);
    this._history.push(record);
    this._historyPointer = this._history.length;
  }
}
