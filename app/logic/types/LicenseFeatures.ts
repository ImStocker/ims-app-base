export type LicenseFeatures = {
  apiAccess: boolean;
  fsMaxFileSize: number;
  fsStorageSize: number;
  gmBuildSize: number;
  maxAssets: number | null;
  maxMembers: number | number;
  roleSettings: boolean;
  taskEstimation: boolean;
  taskWatchers: boolean;
  taskMetrics: boolean;
  exportToPDF: boolean | 'watermark';
  communityShortLink: boolean;
  communityShortLinkHub: boolean;
  changeHistoryDays: number | null;
};
