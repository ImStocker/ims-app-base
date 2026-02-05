import type { Component } from 'vue';
import ImcEditorToolbarFormatButton from './ImcEditorToolbarFormatButton.vue';
import ImcEditorToolbarClearFormatButton from './ImcEditorToolbarClearFormatButton.vue';
import ImcEditorToolbarFormatOptionsButton from './ImcEditorToolbarFormatOptionsButton.vue';
import ImcEditorToolbarFormatColorButton from './ImcEditorToolbarFormatColorButton.vue';
import ImcEditorToolbarFormatLinkButton from './ImcEditorToolbarFormatLinkButton.vue';
import ImcEditorToolbarFormatListButton from './ImcEditorToolbarFormatListButton.vue';
import ImcEditorToolbarFormulaButton from './ImcEditorToolbarFormulaButton.vue';

export type ImcToolbarSection = 'block' | 'inline' | 'additional';

export type ImcToolbarTool = {
  name: string;
  icon: string;
  section: ImcToolbarSection;
  main: number;
  component: Component;
  componentProps?: Record<string, any>;
};

const TEXT_COLORS = [
  false,
  '#e60000',
  '#ff9900',
  '#ffff00',
  '#008a00',
  '#0066cc',
  '#9933ff',
  '#000000',
  '#facccc',
  '#ffebcc',
  '#ffffcc',
  '#cce8cc',
  '#cce0f5',
  '#ebd6ff',
  '#bbbbbb',
  '#f06666',
  '#ffc266',
  '#ffff66',
  '#66b966',
  '#66a3e0',
  '#c285ff',
  '#888888',
  '#a10000',
  '#b26b00',
  '#b2b200',
  '#006100',
  '#0047b2',
  '#6b24b2',
  '#444444',
  '#5c0000',
  '#663d00',
  '#666600',
  '#003700',
  '#002966',
  '#3d1466',
];

const BACKGROUND_COLORS = [
  false,
  '#e6000099',
  '#ff990099',
  '#ffff0099',
  '#008a0099',
  '#0066cc99',
  '#9933ff99',
  '#99999944',
  '#e6000044',
  '#ff990044',
  '#ffff0044',
  '#008a0044',
  '#0066cc44',
  '#9933ff44',
];

export const ImcToolbarTools: ImcToolbarTool[] = [
  {
    name: 'header',
    icon: 'ri-heading',
    section: 'block',
    main: 1,
    component: ImcEditorToolbarFormatOptionsButton,
    componentProps: {
      format: 'header',
      options: [1, 2, 3, 4].map((value) => {
        return {
          value,
          icon: 'ri-h-' + value,
        };
      }),
    },
  },
  {
    name: 'list',
    icon: 'ri-list-check',
    section: 'block',
    main: 1,
    component: ImcEditorToolbarFormatListButton,
    componentProps: {},
  },
  {
    name: 'code-block',
    icon: 'ri-code-box-fill',
    section: 'block',
    main: 3,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'code-block',
    },
  },
  {
    name: 'blockquote',
    icon: 'ri-double-quotes-r',
    section: 'block',
    main: 1,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'blockquote',
    },
  },
  {
    name: 'bold',
    icon: 'ri-bold',
    section: 'inline',
    main: 1,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'bold',
    },
  },
  {
    name: 'italic',
    icon: 'ri-italic',
    section: 'inline',
    main: 1,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'italic',
    },
  },
  {
    name: 'underline',
    icon: 'ri-underline',
    section: 'inline',
    main: 1,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'underline',
    },
  },
  {
    name: 'strike',
    icon: 'ri-strikethrough',
    section: 'inline',
    main: 3,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'strike',
    },
  },
  {
    name: 'color',
    icon: 'ri-font-color',
    section: 'inline',
    main: 1,
    component: ImcEditorToolbarFormatColorButton,
    componentProps: {
      format: 'color',
      colors: TEXT_COLORS,
    },
  },
  {
    name: 'background',
    icon: 'ri-mark-pen-fill',
    section: 'inline',
    main: 1,
    component: ImcEditorToolbarFormatColorButton,
    componentProps: {
      format: 'background',
      colors: BACKGROUND_COLORS,
    },
  },
  {
    name: 'code',
    icon: 'ri-code-s-slash-fill',
    section: 'inline',
    main: 3,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'code',
    },
  },
  {
    name: 'super',
    icon: 'ri-superscript',
    section: 'inline',
    main: 3,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'script',
      formatValue: 'super',
    },
  },
  {
    name: 'sub',
    icon: 'ri-subscript',
    section: 'inline',
    main: 3,
    component: ImcEditorToolbarFormatButton,
    componentProps: {
      format: 'script',
      formatValue: 'sub',
    },
  },
  {
    name: 'link',
    icon: 'ri-link',
    section: 'additional',
    main: 2,
    component: ImcEditorToolbarFormatLinkButton,
    componentProps: {},
  },
  {
    name: 'align',
    icon: 'ri-align-left',
    section: 'additional',
    main: 2,
    component: ImcEditorToolbarFormatOptionsButton,
    componentProps: {
      format: 'align',
      options: ['left', 'center', 'right', 'justify'].map((value) => {
        return {
          value,
          icon: 'ri-align-' + value,
        };
      }),
    },
  },
  {
    name: 'formula',
    icon: 'ri-formula',
    section: 'additional',
    main: 3,
    component: ImcEditorToolbarFormulaButton,
  },
  {
    name: 'clean',
    icon: 'ri-format-clear',
    section: 'additional',
    main: 3,
    component: ImcEditorToolbarClearFormatButton,
  },
];
