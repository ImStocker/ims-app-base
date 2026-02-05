import type JSZip from 'jszip';
import { SyncTargetFileNotFound, type ISyncTarget } from '../ISyncTarget';
import { validateTargetEntryName } from './validateTargetEntryName';

export class ZipSyncTarget implements ISyncTarget {
  constructor(
    private _zip: JSZip,
    private _folder: string = '',
  ) {}

  async putFile(name: string, content: Blob): Promise<void> {
    validateTargetEntryName(name);
    const target_prefix = this._folder ? this._folder + '/' : '';
    this._zip.file(target_prefix + name, content);
  }
  async putFolder(name: string): Promise<ISyncTarget> {
    validateTargetEntryName(name);
    const target_prefix = this._folder ? this._folder + '/' : '';
    this._zip.folder(target_prefix + name);
    return new ZipSyncTarget(this._zip, target_prefix + name);
  }
  async deleteFile(name: string): Promise<void> {
    validateTargetEntryName(name);
    const target_prefix = this._folder ? this._folder + '/' : '';
    this._zip.remove(target_prefix + name);
  }
  async deleteFolder(name: string): Promise<void> {
    validateTargetEntryName(name);
    const target_prefix = this._folder ? this._folder + '/' : '';
    this._zip.remove(target_prefix + name);
  }
  async readTextFile(name: string): Promise<string> {
    validateTargetEntryName(name);
    const target_prefix = this._folder ? this._folder + '/' : '';

    const file = this._zip.file(target_prefix + name);
    if (!file) throw new SyncTargetFileNotFound(name);

    return await file.async('string');
  }
  async isEmpty(): Promise<boolean> {
    return Object.keys(this._zip.files).every((fileName) => {
      return !fileName.startsWith(this._folder);
    });
  }
}
