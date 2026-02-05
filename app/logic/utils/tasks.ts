export const PredefinedColors = new Set([
  'red',
  'blue',
  'orange',
  'green',
  'yellow',
  'purple',
  'pink',
]);

export function getTaskColorValue(color: string | null): string {
  if (!color) return 'transparent';
  else if (PredefinedColors.has(color)) {
    return `var(--task-color-${color})`;
  } else if (/^#[0-9a-f]{3,6}$/i.test(color)) {
    return color;
  } else return 'transparent';
}

export enum TaskDisplayMode {
  BOARD = 'board',
  LIST = 'list',
  CALENDAR = 'calendar',
}

export const TaskWorkspaceTypes: {
  name: string;
  type: string;
  icon: string | null;
}[] = [
  {
    name: 'board',
    type: 'workspace',
    icon: 'ri-table-line',
  },
  {
    name: 'checklist',
    type: 'asset',
    icon: 'ri-list-check-3',
  },
];

export const WORKSPACE_TASKS_NAME = 'tasks';
export const WORKSPACE_CHECKLIST_NAME = 'tasks-items';
export const WORKSPACE_BACKLOG_NAME = 'tasks-backlog';
export const WORKSPACE_BOARDS_NAME = 'tasks-boards';
export const WORKSPACE_MAIN_BOARD_NAME = 'tasks-mainboard';
