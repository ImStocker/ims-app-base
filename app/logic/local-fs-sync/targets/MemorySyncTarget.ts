import { SyncTargetFileNotFound, type ISyncTarget } from '../ISyncTarget';
import { validateTargetEntryName } from './validateTargetEntryName';

export type MemorySyncTargetEntry =
  | {
      type: 'file';
      name: string;
      content: Blob;
    }
  | {
      type: 'folder';
      name: string;
      content: MemorySyncTarget;
    };

export class MemorySyncTarget implements ISyncTarget {
  content = new Map<string, MemorySyncTargetEntry>();

  async putFile(name: string, content: Blob): Promise<void> {
    validateTargetEntryName(name);
    this.content.set(name, {
      type: 'file',
      name,
      content,
    });
  }
  async putFolder(name: string): Promise<ISyncTarget> {
    validateTargetEntryName(name);
    const content = new MemorySyncTarget();
    this.content.set(name, {
      type: 'folder',
      name,
      content,
    });
    return content;
  }
  async deleteFile(name: string): Promise<void> {
    validateTargetEntryName(name);
    this.content.delete(name);
  }
  async deleteFolder(name: string): Promise<void> {
    validateTargetEntryName(name);
    this.content.delete(name);
  }
  async readTextFile(name: string): Promise<string> {
    validateTargetEntryName(name);
    const file = this.content.get(name);
    if (!file || file.type !== 'file') throw new SyncTargetFileNotFound(name);

    return await file.content.text();
  }
  async isEmpty(): Promise<boolean> {
    return this.content.size === 0;
  }
}
