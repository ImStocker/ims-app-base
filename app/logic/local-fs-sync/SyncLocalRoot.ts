import type { AssetPropWhere } from '../types/PropsWhere';

export type SyncLocalRootSegment = {
  id: string;
  saveAs: string;
  index: number;
  assetFilter: AssetPropWhere | null;
  formatId: string;
};

export type SyncLocalRootIndex = {
  imsProjectId: string;
  segments: SyncLocalRootSegment[];
  segmentStates: {
    [segmentName: string]: {
      syncAt: string;
      version: string;
    };
  };
};

export type SyncLocalRootInfo = {
  index: SyncLocalRootIndex;
  status: 'ok' | 'new' | 'badContent' | 'badProject';
};
