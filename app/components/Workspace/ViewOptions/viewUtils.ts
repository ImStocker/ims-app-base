import CollectionBlockCards from '..//CollectionBlockCards.vue';
import CollectionBlockList from '..//CollectionBlockList.vue';
import CollectionBlockGrid from '.././CollectionBlockGrid.vue';
import type { Component } from 'vue';
import type { AssetPropValueSelection } from '../../../logic/types/Props';

export type UserViewSort = {
  prop: string;
  desc: boolean; //default: false
};
export type UserViewFilter = {
  prop: string;
  value: string;
};
export type UserViewProp = {
  prop: string;
  width: number | null;
};
export type UserView = {
  key: string;
  index: number;
  title: string;
  type: ViewType;
  sort: UserViewSort[];
  filter: AssetPropValueSelection | null;
  props: UserViewProp[];
};

export enum ViewType {
  TABLE = 'table',
  LIST = 'list',
  CARDS = 'cards',
}

export type UserViewParams = {
  type: ViewType;
  title: string;
  icon: string;
  component: Component;
  default: () => Partial<UserView>;
};

export const VIEW_TYPES: UserViewParams[] = [
  {
    type: ViewType.LIST,
    title: '[[t:List]]',
    icon: 'ri-list-view',
    component: CollectionBlockList,
    default: () => {
      return {
        props: [
          // { prop: 'gallery|main', width: null }, // type, value, index. Если это файл, то посмотреть файл и отобразить.
          { prop: 'title', width: 200 },
        ],
      };
    },
  },
  {
    type: ViewType.TABLE,
    title: '[[t:Table]]',
    icon: 'ri-table-view',
    component: CollectionBlockGrid,
    default: () => {
      return {
        props: [{ prop: 'title', width: 200 }],
      };
    },
  },
  {
    type: ViewType.CARDS,
    title: '[[t:Cards]]',
    icon: 'ri-gallery-view-2',
    component: CollectionBlockCards,
    default: () => {
      return {
        props: [
          // { prop: 'gallery|main', width: null },
          { prop: 'title', width: 200 },
        ],
      };
    },
  },
];

export const VIEW_TYPES_MAP: { [type: string]: UserViewParams } = {};
VIEW_TYPES.forEach((t) => (VIEW_TYPES_MAP[t.type] = t));
