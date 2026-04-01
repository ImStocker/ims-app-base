import type { AssetPropValueSelection } from '../types/Props';

export type SyncLocalRootSegment = {
  id: string;
  saveAs: string;
  index: number;
  assetSelection: AssetPropValueSelection | null;
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
