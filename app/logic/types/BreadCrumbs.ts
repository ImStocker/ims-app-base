import type { Component } from 'vue';

export type BreadCrumbsEntity = {
  title: string;
  name: string;
  params?: Record<string, any>;
  type?: Component | 'project' | 'router';
  href?: string;
  target?: string;
};
