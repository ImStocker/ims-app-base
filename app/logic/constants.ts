import type { AssetForSelection } from './types/AssetsType';
import type { AssetPropValueAsset } from './types/Props';

export const SYSTEM_PROJECT_ID = '111112';

export const STARTER_EN_PROJECT_ID = '1111JG';
export const STARTER_RU_PROJECT_ID = '1111JH';

export const EMPTY_EN_PROJECT_ID = '1111JJ';
export const EMPTY_RU_PROJECT_ID = '1111JK';

export const TASK_ASSET_ID = '00000000-0000-0000-0000-000000000010';
export const TASK_LIST_ASSET_ID = '00000000-0000-0000-0000-000000000031';
export const GAME_INFO_ASSET_ID = '00000000-0000-0000-0000-100000000000';

export const DISCUSSION_ASSET_ID = '00000000-0000-0000-0000-000000000040';

export const DISCUSSION_WORKSPACE_NAME = 'discussions';
export const TASKS_WORKSPACE_NAME = 'tasks';

export const HUB_PID = '11117u';
export const COLLECTION_PID = '111114T';
export const JAM_PID = '11116B';
export const COLLECTION_PAGE_ASSET_ID = '00000000-0000-0000-0000-100000000200';
export const COLLECTION_GAME_ASSET_ID = '00000000-0000-0000-0000-100000000204';
export const COLLECTION_README_ASSET_ID =
  '00000000-0000-0000-0000-100000000203';
export const COLLECTION_ADDED_GAME_LIST_ASSET_ID =
  '00000000-0000-0000-0000-100000000201';
export const COLLECTION_PENDING_GAME_LIST_ASSET_ID =
  '00000000-0000-0000-0000-100000000202';
export const ARTICLE_ASSET_ID = '00000000-0000-0000-0000-100000000403';

export const SCRIPT_ASSET_ID = '00000000-0000-0000-0000-000000000033';
export const DIAGRAM_ASSET_ID = '00000000-0000-0000-0000-000000000032';
export const GAME_OBJECT_ASSET_ID = '00000000-0000-0000-0000-000000000035';
export const LEVEL_ASSET_ID = '00000000-0000-0000-0000-000000000036';
export const GAME_MECHANICS_ASSET_ID = '00000000-0000-0000-0000-000000000037';
export const MARKDOWN_ASSET_ID = '00000000-0000-0000-0000-000000000039';
export const ENUM_ASSET_ID = '00000000-0000-0000-0000-000000000023';
export const STRUCT_ASSET_ID = '00000000-0000-0000-0000-000000000020';

export const BLOCK_NAME_META = '__meta';
export const BLOCK_TYPE_META = 'props';
export const BLOCK_ID_META = '00000000-0000-0000-0000-000000000100';
export const BLOCK_NAME_LOCALE = 'locale';
export const BLOCK_TYPE_LOCALE = 'locale';
export const BLOCK_NAME_PROPS = 'props';
export const BLOCK_TYPE_PROPS = 'props';

export const TASK_COLUMN_ENUM = '00000000-0000-0000-0000-000000000038';

export const TITLE_CHAR_LIMIT = 20;

export const ASSET_VALUE_STRUCTURE: AssetPropValueAsset = {
  AssetId: STRUCT_ASSET_ID,
  Title: '[[t:Structure]]',
  Name: null,
};

export const ASSET_SELECTION_STRUCTURE: AssetForSelection = {
  id: ASSET_VALUE_STRUCTURE.AssetId,
  title: ASSET_VALUE_STRUCTURE.Title,
  name: ASSET_VALUE_STRUCTURE.Name,
  icon: 'box-1-fill',
};

export const ASSET_VALUE_ENUM: AssetPropValueAsset = {
  AssetId: ENUM_ASSET_ID,
  Title: '[[t:Enum]]',
  Name: null,
};

export const ASSET_SELECTION_ENUM: AssetForSelection = {
  id: ASSET_VALUE_ENUM.AssetId,
  title: ASSET_VALUE_ENUM.Title,
  name: ASSET_VALUE_ENUM.Name,
  icon: 'stack-fill',
};

export const ASSET_SELECTION_GAME_OBJECT: AssetForSelection = {
  id: GAME_OBJECT_ASSET_ID,
  title: '[[t:GameObject]]',
  icon: 'shapes-fill',
  name: null,
};

export const ASSET_SELECTION_MARKDOWN: AssetForSelection = {
  id: MARKDOWN_ASSET_ID,
  title: '[[t:Markdown]]',
  icon: 'markdown-fill',
  name: null,
};

export const ASSET_SELECTION_GAME_MECHANICS: AssetForSelection = {
  id: GAME_MECHANICS_ASSET_ID,
  title: '[[t:GameMechanics]]',
  icon: 'file-settings-fill',
  name: null,
};

export const ASSET_SELECTION_DIAGRAM: AssetForSelection = {
  id: DIAGRAM_ASSET_ID,
  title: '[[t:DiagramElement]]',
  icon: 'organization-chart',
  name: null,
};

export const ASSET_SELECTION_SCRIPT: AssetForSelection = {
  id: SCRIPT_ASSET_ID,
  title: '[[t:ScriptElement]]',
  icon: 'file-paper-2-fill',
  name: null,
};

export const ASSET_SELECTION_LEVEL: AssetForSelection = {
  id: LEVEL_ASSET_ID,
  title: '[[t:LevelMapElement]]',
  icon: 'map-2-line',
  name: null,
};

export const TASK_COLUMNS_ID = '00000000-0000-0000-0000-000000000038';
