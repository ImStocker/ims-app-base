import { SyncTargetFileNotFound, type ISyncTarget } from '../ISyncTarget';
import { validateTargetEntryName } from './validateTargetEntryName';

export class FsSyncTarget implements ISyncTarget {
  constructor(private _baseHandle: FileSystemDirectoryHandle) {}

  async putFile(name: string, content: Blob): Promise<void> {
    validateTargetEntryName(name);
    const fileHandle = await this._baseHandle.getFileHandle(name, {
      create: true,
    });
    const fileStream = await fileHandle.createWritable();
    await fileStream.write(content);
    await fileStream.close();
  }
  async putFolder(name: string): Promise<ISyncTarget> {
    validateTargetEntryName(name);
    const folderHandle = await this._baseHandle.getDirectoryHandle(name, {
      create: true,
    });
    return new FsSyncTarget(folderHandle);
  }
  async deleteFile(name: string): Promise<void> {
    validateTargetEntryName(name);
    try {
      await this._baseHandle.removeEntry(name);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err;
      }
    }
  }
  async deleteFolder(name: string): Promise<void> {
    validateTargetEntryName(name);
    try {
      await this._baseHandle.removeEntry(name, {
        recursive: true,
      });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err;
      }
    }
  }
  async readTextFile(name: string): Promise<string> {
    validateTargetEntryName(name);

    let data: FileSystemFileHandle;
    try {
      data = await this._baseHandle.getFileHandle(name);
    } catch {
      throw new SyncTargetFileNotFound(name);
    }

    const data_file = await data.getFile();
    return await data_file.text();
  }

  async isEmpty() {
    for await (const _file of this._baseHandle.values()) {
      return false;
    }
    return true;
  }
}
