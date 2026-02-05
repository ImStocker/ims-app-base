import type { IAppManager } from '../managers/IAppManager';

type WorkerJob = {
  id: number;
  resolve: (res: Record<string, any>[]) => void;
  reject: (rej: Error) => void;
};

export default class UserCodeExecuteManager {
  private _worker: Worker | null = null;
  private _workerMessageIdGen = 0;
  private _workerJobs: WorkerJob[] = [];
  appManager: IAppManager;

  constructor(appManager: IAppManager) {
    this.appManager = appManager;
  }

  public formatAssetsByCode(fulls: Record<string, any>[], jscode: string) {
    if (!this._worker) {
      const worker = new Worker(
        new URL('./UserCodeExecuteManagerWorker.js', import.meta.url),
        {
          credentials: 'omit',
          name: 'UserCodeExecuteManagerWorker',
        },
      );
      worker.onmessage = (event: MessageEvent) => {
        if (!event.data) return;
        if (event.data.name === 'convertRes') {
          const jobIndex = this._workerJobs.findIndex(
            (j) => j.id === event.data.id,
          );
          if (jobIndex >= 0) {
            const job = this._workerJobs[jobIndex];
            this._workerJobs.splice(jobIndex, 1);
            if (event.data.error) {
              if (
                event.data.error?.message &&
                event.data.error.message === 'full_asset is not defined'
              ) {
                event.data.error.message = this.appManager.$t(
                  'importExport.formats.settings.renameFullAssetInConfig',
                );
              }
              job.reject(event.data.error);
            } else {
              job.resolve(event.data.result ?? []);
            }
          }
        }
      };
      this._worker = worker;
    }
    let new_job_resolve!: (res: Record<string, any>[]) => void;
    let new_job_reject!: (rej: Error) => void;
    const new_job_promise = new Promise<Record<string, any>[]>((res, rej) => {
      new_job_reject = rej;
      new_job_resolve = res;
    });
    const new_job: WorkerJob = {
      id: ++this._workerMessageIdGen,
      resolve: new_job_resolve,
      reject: new_job_reject,
    };
    const fulls_raw = JSON.parse(JSON.stringify(fulls));
    this._worker.postMessage({
      name: 'convertCall',
      id: new_job.id,
      jscode: jscode && jscode.trim() ? jscode : 'return asset_data;',
      assets: fulls_raw,
    });
    this._workerJobs.push(new_job);
    return new_job_promise;
  }
}
