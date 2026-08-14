import { AppSubManagerBase } from '../managers/IAppManager';
import { v4 as uuidv4 } from 'uuid';
import ProjectManager from '#logic/managers/ProjectManager';
import type {
  AiSession,
  IAiSessionStorage,
  AiTurn,
  AiThinkingAction,
  AiTextAction,
} from './AiTypes';
import AiManager from './AiManager';
import { streamText } from 'ai';
import type { IProjectDatabase } from '#logic/types/IProjectDatabase';
import {
  AiProjectTools,
  ASSETPROPVALUE_TYPES,
  PROPS_FORMAT,
} from '#logic/ai-core/AiProjectTools';
import EditorManager from '#logic/managers/EditorManager';
import { decodeLLMJSONWithAi } from './llm-utils';
import { formatDate } from '#logic/utils/format';

export default class AiEditManager extends AppSubManagerBase {
  sessions: AiSession[] = [];
  turns: AiTurn[] = [];
  currentSessionId: string | null = null;
  isGenerating = false;
  changeIds: string[] = [];
  turnVersion = 0;
  private _abortController: AbortController | null = null;
  private _tools: AiProjectTools | null = null;
  private _sessionStorage: IAiSessionStorage | null = null;
  private _projectDatabase: IProjectDatabase | null = null;

  async init(project_database: IProjectDatabase): Promise<void> {
    this._projectDatabase = project_database;
    this.rebuildTools();
  }

  setSessionStorage(storage: IAiSessionStorage) {
    this._sessionStorage = storage;
  }

  protected rebuildTools() {
    const db = this._getProjectDatabase();
    this._tools = db ? new AiProjectTools(db) : null;
  }

  protected _getProjectDatabase(): IProjectDatabase | null {
    return this._projectDatabase;
  }

  private get _session_db(): IAiSessionStorage | null {
    return this._sessionStorage;
  }

  stop(): void {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  async loadSessions(): Promise<void> {
    const db = this._session_db;
    if (!db) return;
    try {
      this.sessions = await db.loadSessions();
    } finally {
      // Do nothing
    }
  }

  async createSession(title?: string): Promise<AiSession> {
    const db = this._session_db;
    if (!db) throw new Error('No active project');
    const projectManager = this.appManager.get(ProjectManager);
    const info = projectManager.getProjectInfo();
    if (!info) throw new Error('No active project');
    const now = new Date().toISOString();
    const session: AiSession = {
      id: uuidv4(),
      projectId: info.id,
      title:
        title ||
        (this.sessions.length === 0
          ? this.appManager.$t('aiAssistant.defaultSessionName')
          : this.appManager.$t('aiAssistant.sessionName', {
              date: formatDate(now),
            })),
      createdAt: now,
      updatedAt: now,
    };
    await db.createSession(session);
    this.sessions = [session, ...this.sessions];
    this.currentSessionId = session.id;
    this.turns = [];
    this.changeIds = [];
    return session;
  }

  async deleteMessagesOfCurrentSessionId(): Promise<void> {
    const db = this._session_db;
    const id = this.currentSessionId;
    if (!db || !id) return;
    this.turns = [];
    this.changeIds = [];
    await db.deleteTurnsOfSession(id);
    await db.deleteMessagesOfSession(id);
  }

  async renameSession(id: string, title: string): Promise<void> {
    const db = this._session_db;
    if (!db) return;
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const updated = {
      ...this.sessions[idx],
      title,
      updatedAt: new Date().toISOString(),
    };
    await db.updateSession(updated);
    this.sessions[idx] = updated;
  }

  async deleteSession(id: string): Promise<void> {
    const db = this._session_db;
    if (!db) return;
    await db.deleteSession(id);
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.currentSessionId === id) {
      this.currentSessionId = null;
      this.turns = [];
      this.changeIds = [];
    }
  }

  async selectSession(id: string): Promise<void> {
    this.currentSessionId = id;
    this.changeIds = [];
    await this._loadTurns(id);
    const db = this._session_db;
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (db && idx >= 0) {
      const updated = {
        ...this.sessions[idx],
        updatedAt: new Date().toISOString(),
      };
      this.sessions[idx] = updated;
      await db.updateSession(updated);
    }
  }

  private async _loadTurns(sessionId: string): Promise<void> {
    const db = this._session_db;
    if (!db) return;
    this.turns = await db.loadTurns(sessionId);
  }

  async sendMessage(text: string) {
    const db = this._session_db;
    if (!db) throw new Error('No active project');

    let sessionId = this.currentSessionId;
    if (!sessionId) {
      const session = await this.createSession();
      sessionId = session.id;
      this.currentSessionId = sessionId;
    }

    const now = new Date().toISOString();

    const sessionIdx = this.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIdx >= 0 && this.sessions[sessionIdx].updatedAt !== now) {
      const updated = {
        ...this.sessions[sessionIdx],
        updatedAt: now,
      };
      this.sessions[sessionIdx] = updated;
      await db.updateSession(updated);
    }

    const turn: AiTurn = {
      id: uuidv4(),
      sessionId,
      userMessage: text,
      actions: [],
      changeIds: [],
      createdAt: now,
      status: 'created',
    };

    await db.createTurn(turn);
    this.turns = [...this.turns, turn];
    this.isGenerating = true;

    this._abortController = new AbortController();
    const signal = this._abortController.signal;

    try {
      await this._generate(turn, signal);
      turn.status = 'done';
    } catch (err: any) {
      if (signal.aborted) {
        turn.status = 'done';
      } else {
        turn.status = 'error';
        turn.error = String(err);
      }
    } finally {
      turn.completedAt = new Date().toISOString();
      this.isGenerating = false;
      this._abortController = null;
      if (turn.changeIds.length > 0) {
        this.changeIds = [...new Set([...this.changeIds, ...turn.changeIds])];
      }
      await db.updateTurn(turn);
      this.turnVersion++;
      this.turns = [...this.turns];
    }
  }

  private async _generate(turn: AiTurn, signal: AbortSignal): Promise<void> {
    const modelDef = this.appManager.get(AiManager).getAiModelDef();
    if (!modelDef) {
      throw new Error('AI model is not selected');
    }

    turn.status = 'streaming';
    const instructions = this._buildInstructions();

    const tools = this._tools;
    if (!tools) throw new Error('AiEditManager is not initialized');
    const toolImpls: Record<string, (args: any, turn: AiTurn) => Promise<any>> =
      {
        getAsset: async ({ id }: { id: string }) => {
          if (!id)
            throw new Error(
              'Missing required parameter "id". Provide a valid asset ID string from the listAssets result.',
            );
          return await tools.getAsset.handler({ id });
        },
        listAssets: async (args: any) => {
          return await tools.listAssets.handler(args ?? {});
        },
        searchAssets: async (args: any) => {
          return await tools.searchAssets.handler(args ?? {});
        },
        changeAsset: async (input: any, turn: AiTurn) => {
          const result = await tools.changeAsset.handler(input);
          if (!result.success) throw new Error(result.error);
          if (result.changeId) turn.changeIds.push(result.changeId);
          return result;
        },
        createAsset: async (args: any, turn: AiTurn) => {
          const result = await tools.createAsset.handler(args);
          if (!result.success) throw new Error(result.error);
          if (result.changeId) turn.changeIds.push(result.changeId);
          return result;
        },
        deleteAsset: async (args: any, turn: AiTurn) => {
          const result = await tools.deleteAsset.handler(args);
          if (!result.success) throw new Error(result.error);
          if (result.changeId) turn.changeIds.push(result.changeId);
          return result;
        },
        createWorkspace: async (args: any) => {
          const result = await tools.createWorkspace.handler(args);
          if (!result.success) throw new Error(result.error);
          return result;
        },
        listWorkspaces: async (args: any) => {
          return await tools.listWorkspaces.handler(args ?? {});
        },
      };

    const messages: any[] = this._buildMessages();
    let thinkingOnlyRetries = 0;
    const MAX_THINKING_RETRIES = 3;
    const MAX_STEPS = 20;

    for (let step = 0; step < MAX_STEPS; step++) {
      if (signal.aborted) return;

      const result = streamText({
        model: modelDef.model,
        system: instructions,
        messages,
        abortSignal: signal,
        maxOutputTokens: 4000,
      });

      let textActionIdx: number | null = null;
      let reasoningActionIdx: number | null = null;
      let textContent = '';
      let reasoningText = '';

      for await (const part of result.fullStream) {
        if (signal.aborted) return;

        if (part.type === 'reasoning-delta') {
          reasoningText += part.text;
          if (reasoningActionIdx === null) {
            turn.actions.push({ type: 'thinking', text: '' });
            reasoningActionIdx = turn.actions.length - 1;
          }
          (turn.actions[reasoningActionIdx] as AiThinkingAction).text =
            reasoningText;
          this.turnVersion++;
          this.turns = [...this.turns];

          if (this._isTokenLoop(reasoningText)) {
            turn.status = 'error';
            turn.error =
              'The AI got stuck in a repetition loop. Please try again with a simpler request.';
            return;
          }
        } else if (part.type === 'text-delta') {
          textContent += part.text;
          if (textActionIdx === null) {
            turn.actions.push({ type: 'text', content: '' });
            textActionIdx = turn.actions.length - 1;
          }
          (turn.actions[textActionIdx] as AiTextAction).content = textContent;
          this.turnVersion++;
          this.turns = [...this.turns];

          if (this._isTokenLoop(textContent)) {
            throw new Error(
              'The AI got stuck in a repetition loop. Please try again with a simpler request.',
            );
          }
        } else if (part.type === 'error') {
          throw part.error;
        }
      }

      if (signal.aborted) return;

      const allMatches = Array.from(
        textContent.matchAll(/<tool_call>([\s\S]*?)<\/tool_call>/g),
      );

      if (allMatches.length === 0) {
        const unclosedMatch = textContent.match(/<tool_call>([\s\S]*?)$/);
        if (unclosedMatch) {
          messages.push({ role: 'assistant', content: textContent });
          messages.push({
            role: 'user',
            content:
              "[System: The tool call above is incomplete — it's missing the closing </tool_call> tag. Repeat the exact same tool call with the full JSON and proper closing tag.]",
          });
          continue;
        }

        if (
          reasoningText &&
          !textContent &&
          thinkingOnlyRetries < MAX_THINKING_RETRIES
        ) {
          thinkingOnlyRetries++;
          messages.push({ role: 'assistant', content: reasoningText });
          messages.push({
            role: 'user',
            content:
              "You provided reasoning but no answer. Answer the user's question based on your reasoning above. Output only the answer, no thinking this time.",
          });
          continue;
        }

        if (textContent.includes('<DONE>')) {
          const cleanText = textContent.replace(/<DONE>\s*$/, '').trim();
          if (textActionIdx !== null && cleanText) {
            (turn.actions[textActionIdx] as AiTextAction).content = cleanText;
            this.turnVersion++;
            this.turns = [...this.turns];
          }
          return;
        }

        if (step < MAX_STEPS - 1) {
          messages.push({ role: 'assistant', content: textContent });
          messages.push({
            role: 'user',
            content:
              "[System: You have not yet completed the user's request. If you are finished, end your response with <DONE>. Otherwise continue working — make the necessary tool calls to complete the task.]",
          });
          continue;
        }
        return;
      }

      let lastEnd = 0;
      let firstTextActionHandled = false;

      for (const match of allMatches) {
        const textBefore = textContent.slice(lastEnd, match.index);
        const toolCallJson = match[1]!.trim();

        const assistantContent =
          textBefore + `<tool_call>${toolCallJson}</tool_call>`;
        messages.push({ role: 'assistant', content: assistantContent });

        if (!firstTextActionHandled) {
          if (textBefore) {
            if (textActionIdx !== null) {
              (turn.actions[textActionIdx] as AiTextAction).content =
                textBefore;
            } else {
              turn.actions.push({ type: 'text', content: textBefore });
            }
          } else if (textActionIdx !== null) {
            turn.actions.splice(textActionIdx, 1);
            textActionIdx = null;
          }
          firstTextActionHandled = true;
          this.turnVersion++;
          this.turns = [...this.turns];
        }

        let parsed: any;
        try {
          parsed = await decodeLLMJSONWithAi(modelDef.model, toolCallJson);
        } catch {
          continue;
        }

        const toolName = parsed.name || parsed.tool;
        const args = parsed.args || parsed.arguments || {};
        const toolFn = toolImpls[toolName];

        if (!toolFn) {
          messages.push({
            role: 'user',
            content: `[Error: Unknown tool "${toolName}". Available: ${Object.keys(toolImpls).join(', ')}]`,
          });
          turn.actions.push({
            type: 'tool-call',
            toolName,
            args,
            result: { success: false, error: `Unknown tool "${toolName}"` },
          });
          this.turnVersion++;
          this.turns = [...this.turns];
          lastEnd = match.index! + match[0].length;
          continue;
        }

        let resultVal: any;
        let error: string | undefined;
        try {
          resultVal = await toolFn(args, turn);
        } catch (err: any) {
          error = err.message;
        }

        const wrapped: any = error
          ? { success: false, error }
          : { success: true, result: resultVal };
        messages.push({
          role: 'user',
          content: `[Tool "${toolName}" result]: ${JSON.stringify(wrapped)}`,
        });

        turn.actions.push({
          type: 'tool-call',
          toolName,
          args,
          result: wrapped,
        });
        this.turnVersion++;
        this.turns = [...this.turns];

        lastEnd = match.index! + match[0].length;
      }

      const trailingText = textContent.slice(lastEnd);
      if (trailingText) {
        messages.push({ role: 'assistant', content: trailingText });
        turn.actions.push({ type: 'text', content: trailingText });
        this.turnVersion++;
        this.turns = [...this.turns];
      }
    }

    turn.actions.push({ type: 'text', content: 'Max iterations reached.' });
    this.turnVersion++;
    this.turns = [...this.turns];
  }

  protected _buildBlockSpecs(): string {
    const editorManager = this.appManager.get(EditorManager);
    const blocks = editorManager.getBlockTypesList();
    const lines: string[] = [];
    for (const block of blocks) {
      if (block.aiSpec.brief) {
        let text = `  - **${block.name}**: ${block.aiSpec.brief}`;
        if (block.aiSpec.needSpec && block.aiSpec.spec) {
          text += `\n    ${block.aiSpec.spec}`;
        }
        lines.push(text);
      }
    }
    return lines.join('\n');
  }

  protected _buildFieldSpecs(): string {
    const editorManager = this.appManager.get(EditorManager);
    const fields = editorManager.getFieldTypesList();
    const lines: string[] = [];
    for (const field of fields) {
      if (field.aiSpec.brief) {
        let text = `  - **${field.name}**: ${field.aiSpec.brief}`;
        if (field.aiSpec.needSpec && field.aiSpec.spec) {
          text += `\n    ${field.aiSpec.spec}`;
        }
        lines.push(text);
      }
    }
    return lines.join('\n');
  }

  /**
   * Assembles the system prompt from overridable sections.
   * Subclasses override individual section builders instead of the whole prompt.
   */
  protected _buildInstructions(): string {
    return [
      this._buildRole(),
      this._buildToolsReference(),
      this._buildToolCallingFormat(),
      this._buildRules(),
      this._buildProjectStructure(),
      this._buildAssetInheritance(),
      this._buildGetAssetResponseFormat(),
      PROPS_FORMAT,
      ASSETPROPVALUE_TYPES,
      this._buildFieldControllers(),
      this._buildEditingRules(),
      this._buildBlockTypes(),
      this._buildChangeAssetFormat(),
      this._buildCreateAssetFormat(),
      this._buildExtraContext(),
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  /** App-specific role. Override in subclasses (e.g. scriptwriter persona). */
  protected _buildRole(): string {
    return 'You are an assistant that helps users manage project files. Your task is to help users work with assets and workspaces.';
  }

  protected _buildToolsReference(): string {
    return `Available functions:
1. getAsset({id}) — Get the full content of a file by its ID
2. listAssets — Get a list of all project files (names, IDs, typeIds)
3. searchAssets({ workspaceId?, query?, typeIds? }) — Search and filter project files
4. changeAsset({ id, title?, name?, icon?, parentId?, workspaceId?, delete?, blocks? }) — modifies a file by its ID
5. createAsset(params) — create a new file in the project (requires title, workspaceId, parentId)
6. deleteAsset({id}) — soft delete (trash) a project file by its ID
7. createWorkspace({ title, parentId?, props? }) — create a new workspace (folder); set props to {"type":"collection","asset":{...}} for a collection workspace
8. listWorkspaces — Get a list of all workspaces (IDs, names, titles, parentIds, props)`;
  }

  protected _buildToolCallingFormat(): string {
    return `TOOL CALLING FORMAT:
To use a function, include this in your response:
<tool_call>{"name":"function_name","args":{...key: value}}</tool_call>

Example:
Let me search for that file first.
<tool_call>{"name":"listAssets","args":{}}</tool_call>

After I execute the tool, the result will appear as a user message. Continue your response based on it.
You can call multiple tools sequentially. You may include a short text explanation before a tool call — the system will strip the text and only execute the tool call tag. When you have enough information to answer, respond directly without a tool call tag.
If a tool returns an error or null, check your parameters — you likely missed a required field. Use the exact ID from listAssets when calling getAsset.
When you have fully completed the user's request (all edits, searches, explanations done), end your final response with <DONE>. If you're still working toward the goal (e.g., you still need to search, edit, or verify), do NOT output <DONE> yet — keep making tool calls until the job is finished.
If the user's message is just a greeting, small talk ("hello", "how are you", "thanks", etc.), or anything that doesn't require looking up project files or making edits, respond briefly and add <DONE> immediately — there's nothing to do.`;
  }

  protected _buildRules(): string {
    return `Rules:

- When the user asks about a file:
  - First call listAssets to get the list of all files (and listWorkspaces to see the folder structure)
  - Find a file in the list with a name similar to the query
  - Call getAsset with the found id
  - Answer ONLY based on the data from getAsset
  - If the file is not found, say: "File '{name}' not found in the project. Would you like to create it?"`;
  }

  protected _buildProjectStructure(): string {
    return `Project structure:

A project consists of:
- **Assets** (files) — each asset has a unique id, name, title, typeIds (its parent chain), and blocks of data.
- **Workspaces** (folders) — assets are organized into workspaces.`;
  }

  protected _buildAssetInheritance(): string {
    return `Asset inheritance:
Assets can inherit from other assets. If asset A inherits from B (via parentIds), A gets all blocks from B plus its own blocks. The **typeIds** of an asset is the list of all ancestor asset IDs in its inheritance chain.`;
  }

  protected _buildGetAssetResponseFormat(): string {
    return `getAsset response format:
The function returns an object with the following structure:

{
  "id": "string — unique file identifier",
  "name": "string — short file name",
  "title": "string — full file title",
  "workspaceId": "string — workspace id the asset belongs to",
  "typeIds": ["string"] — read-only list of all parent asset IDs in inheritance chain
  "blocks": [
    {
      "id": "string — block identifier",
      "name": "string | undefined — block name (if present)",
      "title": "string — block title",
      "props": { "key1": "value1", "key2": "value2" },
      "inherited": { ... } | null,
      "computed": { ... }
    }
  ]
}`;
  }

  protected _buildFieldControllers(): string {
    return `Field type controllers reference:
${this._buildFieldSpecs()}`;
  }

  protected _buildEditingRules(): string {
    return `Editing project files:

You have the ability to edit project files using the changeAsset function.

When to use:
- User asks to rename a file
- User asks to add, edit, or delete a block in any file
- User asks to change any property (title, name, icon, etc.)

IMPORTANT rules for editing:
- BEFORE editing, you MUST call getAsset to see current content
- After editing, confirm what was changed
- If user asks to delete something, ask for confirmation first (unless the request is explicit like "delete the block X")
- To add a new block to an asset, you must provide its type — the \`type\` field tells the system what kind of block it is.`;
  }

  protected _buildBlockTypes(): string {
    return `Block types:
${this._buildBlockSpecs()}`;
  }

  protected _buildChangeAssetFormat(): string {
    return `changeAsset parameter format (flat — id is separate, all other fields map directly to args):

1. Rename a file:
{"id": "asset_123", "title": "New Title Here"}

2. Add a new block (must include type):
{"id": "asset_123", "blocks": {"blockName": {"type": "text", "props": {"content": "Some text here"}}}}

3. Edit an existing block's props (type already set):
{"id": "asset_123", "blocks": {"biography": {"props": {"backstory": "Updated text here..."}}}}

4. Delete a block entirely:
{"id": "asset_123", "blocks": {"unusedBlock": null}}

5. Delete individual props within a block (use ~ prefix):
{"id": "asset_123", "blocks": {"personality": {"props": {"~flaw": null}}}}`;
  }

  protected _buildCreateAssetFormat(): string {
    return `createAsset parameter format (blocks as array):
{"title": "New Asset", "workspaceId": "workspace_id", "parentId": "parent_template_id", "blocks": [{"name": "description", "type": "props", "props": {"content": "Some text"}}]}`;
  }

  /**
   * App-specific extra instructions appended to the system prompt.
   * Empty by default — subclasses (e.g. scriptwriter) add their own context
   * without overriding the whole prompt.
   */
  protected _buildExtraContext(): string {
    return '';
  }

  private _isTokenLoop(text: string): boolean {
    const tail = text.slice(-250);
    if (tail.length < 30) return false;

    const consecutiveThreshold = Math.max(6, Math.floor(tail.length / 3));
    for (let len = 2; len <= 8; len++) {
      const pattern = tail.slice(-len);
      let count = 0;
      let pos = tail.length - len;
      while (pos >= 0 && tail.slice(pos, pos + len) === pattern) {
        count++;
        pos -= len;
      }
      if (count >= consecutiveThreshold) return true;
    }

    const tokens = tail.split(/\s+/).filter(Boolean);
    if (tokens.length >= 15) {
      const uniqueTokens = new Set(tokens).size;
      if (uniqueTokens / tokens.length < 0.25) return true;
    }

    const chars = tail.replace(/\s+/g, '');
    if (chars.length >= 30) {
      const uniqueChars = new Set(chars).size;
      if (uniqueChars <= 6) return true;
    }

    return false;
  }

  private _buildMessages(): any[] {
    const messages: any[] = [];
    for (const turn of this.turns) {
      messages.push({ role: 'user', content: turn.userMessage });
      for (const action of turn.actions) {
        if (action.type === 'text' && action.content) {
          messages.push({ role: 'assistant', content: action.content });
        } else if (action.type === 'tool-call') {
          messages.push({
            role: 'assistant',
            content: `<tool_call>${JSON.stringify({ name: action.toolName, args: action.args })}</tool_call>`,
          });
          if (action.result) {
            messages.push({
              role: 'user',
              content: `[Tool "${action.toolName}" result]: ${JSON.stringify(action.result)}`,
            });
          }
        }
      }
    }
    return messages;
  }

  get hasActiveProject(): boolean {
    return !!this._getProjectDatabase();
  }
}
