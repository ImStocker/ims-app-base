import type { AssetSetDTO, AssetShort } from './AssetsType';
import type { ApiResultListWithMore } from './ProjectTypes';
import type { UserWithNameDTO } from './UserType';

export type AssetHistoryUserDTO = {
  AccountId: string;
  Name: string;
};

export type AssetHistoryDTO = {
  id: string;
  undo: AssetSetDTO;
  redo: AssetSetDTO;
  user: AssetHistoryUserDTO;
  createdAt: string;
};

export type AssetGlobalHistoryDTO = {
  id: string;
  user: UserWithNameDTO;
  assetIds: string[];
  createdAt: string;
};

export type AssetGlobalHistoryResultObjectsDTO = {
  assetShorts: {
    [key: string]: AssetShort;
  };
};

export type AssetGlobalHistoryResultDTO =
  ApiResultListWithMore<AssetGlobalHistoryDTO> & {
    objects: AssetGlobalHistoryResultObjectsDTO;
    list: AssetGlobalHistoryDTO[];
  };
