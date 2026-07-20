export type BlockAiSpec = {
  brief: string;
  spec?: string;
  needSpec?: boolean;
};

export type AiSpecEntry = {
  name: string;
  aiSpec: BlockAiSpec;
  icon?: string;
  title?: string;
};
