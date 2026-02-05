export class SyncTargetFileNotFound extends Error {
  constructor(public override name: string) {
    super('File not found: ' + name);
  }
}

export interface ISyncTarget {
  putFile(name: string, content: Blob): Promise<void>;
  putFolder(name: string): Promise<ISyncTarget>;
  deleteFile(name: string): Promise<void>;
  deleteFolder(name: string): Promise<void>;
  readTextFile(name: string): Promise<string>;
  isEmpty(): Promise<boolean>;
}
