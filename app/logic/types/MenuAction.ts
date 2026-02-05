export type MenuAction = {
  title: string;
  action: () => void;
  danger: boolean;
  icon: string | null;
};
