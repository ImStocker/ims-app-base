import type { AssetGlobalHistoryDTO } from '../types/AssetHistory';

export interface IProjectHistoryVM {
  getGlobalHistoryChanges(): AssetGlobalHistoryDTO[];
  loadMoreChanges(): Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  loadError: any;
  loadMoreError: any;
}
