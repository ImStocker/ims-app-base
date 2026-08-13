export type AiSession = {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AiMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

/* --- Structured actions per turn --- */

export type AiThinkingAction = { type: 'thinking'; text: string };
export type AiToolCallAction = {
  type: 'tool-call';
  toolName: string;
  args: any;
  result?: { success: boolean; result?: any; error?: string };
};
export type AiTextAction = { type: 'text'; content: string };
export type AiAction = AiThinkingAction | AiToolCallAction | AiTextAction;

export type AiTurn = {
  id: string;
  sessionId: string;
  userMessage: string;
  actions: AiAction[];
  changeIds: string[];
  createdAt: string;
  completedAt?: string;
  status: 'created' | 'streaming' | 'done' | 'error';
  error?: string;
};

export interface IAiSessionStorage {
  loadSessions(): Promise<AiSession[]>;
  createSession(session: AiSession): Promise<void>;
  updateSession(session: AiSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteMessagesOfSession(sessionId: string): Promise<void>;
  loadTurns(sessionId: string): Promise<AiTurn[]>;
  createTurn(turn: AiTurn): Promise<void>;
  updateTurn(turn: AiTurn): Promise<void>;
  deleteTurnsOfSession(sessionId: string): Promise<void>;
}
