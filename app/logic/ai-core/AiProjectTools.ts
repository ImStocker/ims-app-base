import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { IProjectDatabase } from '../types/IProjectDatabase';
import type { AssetShort } from '../types/AssetsType';
import type { Workspace } from '../types/Workspaces';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AiToolDef<TArgs = any, TResult = any> = {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodType>;
  handler: (args: TArgs) => Promise<TResult>;
};

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const parseJsonString = z.string().transform((str, ctx) => {
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON string' });
    return z.NEVER;
  }
});

const blockSchema = z.object({
  type: z.string(),
  name: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  index: z.number().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  delete: z.literal(true).optional(),
  reset: z.literal(true).optional(),
});

const changeBlockSchema = z
  .object({
    type: z.string().optional(),
    name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    index: z.number().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    delete: z.literal(true).optional(),
    reset: z.literal(true).optional(),
  })
  .passthrough();

type BlockArrayItem = z.infer<typeof blockSchema>;

function mapToBlocksArray(map: Record<string, any>): BlockArrayItem[] {
  return Object.entries(map).map(([key, block], index) => ({
    type: block?.type ?? 'text',
    name: key.startsWith('@') ? null : key,
    title: block?.title,
    index: block?.index ?? index + 1,
    props: block?.props,
    delete: block?.delete,
    reset: block?.reset,
  }));
}

const rawBlocksInput = z.union([
  z.array(blockSchema),
  z.record(z.string(), changeBlockSchema),
  parseJsonString.pipe(
    z.union([z.array(blockSchema), z.record(z.string(), changeBlockSchema)]),
  ),
]);

export const blocksArraySchema = rawBlocksInput.optional().transform((val) => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val;
  return mapToBlocksArray(val);
});

export const blocksMapSchema = z
  .record(z.string(), changeBlockSchema)
  .optional()
  .or(parseJsonString.pipe(z.record(z.string(), changeBlockSchema)).optional());

// ── Description text constants ────────────────────────────────────────────────

export const ASSETPROPVALUE_TYPES =
  'ASSETPROPVALUE TYPES (each prop value can be one of):\n' +
  '- null — no value\n' +
  '- string — plain text\n' +
  '- number (integer or float)\n' +
  '- boolean — true/false\n' +
  '- number[] — array of numbers\n' +
  '- {Str: string, Ops: object[]} — rich text with Quill Delta formatting\n' +
  '- {FileId: string, Title: string, Size: number, Store: string} — file/asset reference\n' +
  '- {Blob: any, Type: string} — binary blob\n' +
  '- {F: any} — formula expression (evaluated at runtime)\n' +
  '- {AssetId: string, Title: string, Name?: string, BlockId?: string} — link to another project asset\n' +
  '- {AccountId: string, Name: string} — link to a user account\n' +
  '- {Enum: string, Name: string, Title: string} — enum value with type name, key, and display title\n' +
  '- {ProjectId: string, Title: string} — link to another project\n' +
  '- {WorkspaceId: string, Title: string, Name?: string} — workspace reference\n' +
  '- {Select: any, Group: any, Str: string, Where: object} — dynamic selection query\n' +
  '- {Str: string, Ts: number} — timestamp with ISO string and Unix seconds\n' +
  '- {Type: string, Kind?: string, Of?: object} — type descriptor';

export const PROPS_FORMAT =
  'PROPS FORMAT (flat key-value with backslash separators for nesting):\n' +
  '{"key1\\subkey": "value"} represents {key1: {subkey: "value"}}\n' +
  'So "description\\en" means description.en, and "stats\\health\\max" means stats.health.max.';

export const ERROR_RECOVERY =
  'ERROR HANDLING: If this tool returns an error, check your parameters — you likely missed a required field or used an invalid ID. ' +
  'Use listAssets or searchAssets to find valid IDs, then retry.';

// ── Tool descriptions (without block specs — added by consumer) ───────────────

const CREATE_ASSET_DESC =
  'Create a new asset in the project.\n\n' +
  'HOW ASSET CREATION WORKS:\n' +
  '- Typed assets inherit ALL blocks from the parent type automatically.\n' +
  '- Before creating a typed asset, first read the parent type with getAsset to see its block structure.\n' +
  '- You CAN pass blocks when creating a typed asset — they will be merged with inherited blocks.\n' +
  '- If you pass blocks with matching names, their props will be set on creation.\n\n' +
  'BLOCKS FORMAT:\n' +
  'The "blocks" parameter accepts an ARRAY of block objects. Each block has:\n' +
  '  - type (REQUIRED): block type string ("text", "props", "table", "gallery", "checklist", "embed", "script", "diagram", etc.)\n' +
  '  - name: block key name (e.g. "description", "biography"). If omitted, a unique key is generated.\n' +
  '  - title: display title (optional)\n' +
  '  - index: sort order (optional)\n' +
  '  - props: flat key-value properties for this block\n\n' +
  'EXAMPLE — create with blocks (array format):\n' +
  '{"title": "Bob", "blocks": [{"type": "props", "name": "biography", "props": {"age": 25, "class": "warrior"}}]}\n\n' +
  'EXAMPLE — create text element (no parent):\n' +
  '{"title": "My Note", "blocks": [{"type": "text", "props": {"value": "Hello world"}}]}\n\n' +
  'EXAMPLE — create typed asset with blocks:\n' +
  '{"title": "Alex", "parentId": "character_type_id", "blocks": [{"type": "props", "name": "biography", "props": {"age": 30}}]}\n\n' +
  'TYPED ASSETS (set parentId to inherit blocks from type):\n' +
  '- DiagramElement: "00000000-0000-0000-0000-000000000032" — visual diagrams/flowcharts\n' +
  '- ScriptElement: "00000000-0000-0000-0000-000000000033" — visual scripts/dialogues\n' +
  '- GameObject: "00000000-0000-0000-0000-000000000035" — game object definitions\n' +
  '- LevelEditor: "00000000-0000-0000-0000-000000000036" — level/map editor\n' +
  '- GameMechanics: "00000000-0000-0000-0000-000000000037" — game mechanics docs\n' +
  '- Markdown: "00000000-0000-0000-0000-000000000039" — markdown documents\n' +
  '- GraphElement: "00000000-0000-0000-0000-000000000041" — node-tree/graph editor\n' +
  '- Task: "00000000-0000-0000-0000-000000000010" — task/kanban card\n' +
  '- Chat: "00000000-0000-0000-0000-000000000040" — discussion/chat\n' +
  '- Structure: "00000000-0000-0000-0000-000000000020" — structured data type\n' +
  '- Enum: "00000000-0000-0000-0000-000000000023" — enumeration type\n\n' +
  'WORKSPACE: If workspaceId is not provided, defaults to the root "gdd" workspace.\n\n' +
  'BEFORE CREATING A TYPED ASSET: First call getAsset on the parent type to see its block structure. ' +
  'Then fill in values for those existing blocks in your call instead of making up new block names.\n\n' +
  'MERGE RULES (critical for typed assets):\n' +
  '- A block you pass is merged with the inherited block of the SAME NAME: matching name → its props are set (e.g. name "description" fills the inherited "description" block).\n' +
  '- A block passed WITHOUT a name creates a NEW block — it does NOT merge with anything.\n' +
  '- If an inherited block has NO name (name is null — e.g. the Markdown type), you cannot target it from createAsset. ' +
  'Create the asset first, then use changeAsset with {"@<blockId>": {"props": {...}}} using the block id from getAsset.\n' +
  '- After creating a typed asset, verify with getAsset which blocks actually received your values.\n\n' +
  PROPS_FORMAT +
  '\n\n' +
  ASSETPROPVALUE_TYPES +
  '\n\n' +
  '⚠ IMPORTANT: Before creating or modifying any complex block type, you MUST first read the full block specification.\n' +
  'Blocks with complex internal structures: props, table, gallery, checklist, block-mirror, script, diagram, textgrid, markdown, leveleditor.\n' +
  'Do not guess their format — always read the spec first.\n\n' +
  ERROR_RECOVERY;

const CHANGE_ASSET_DESC =
  'Modify an existing asset. You can change title, name, parentId, workspaceId, icon, isAbstract, or blocks. ' +
  'Only provide the fields you want to change — omitted fields stay unchanged.\n\n' +
  'BEFORE EDITING: Always call getAsset first to see the current content of the asset.\n\n' +
  'CHANGE FORMAT:\n' +
  '1. Rename: {"id": "asset_123", "title": "New Title"}\n' +
  '2. Edit block props: {"id": "asset_123", "blocks": {"biography": {"props": {"key": "value"}}}}\n' +
  '3. Delete block: {"id": "asset_123", "blocks": {"unusedBlock": {"delete": true}}}\n' +
  '4. Delete individual props (use ~ prefix): {"id": "asset_123", "blocks": {"personality": {"props": {"~flaw": null}}}}\n\n' +
  'BLOCKS FORMAT (object/map — key is block name or @blockId):\n' +
  '{"blockName": {"type": "text", "props": {"key": "value"}}}\n' +
  '{"@blockUuid": {"props": {"key": "value"}}}\n\n' +
  'To set the parent type, use parentId (a single string). Internally it is stored as parentIds: [parentId]. ' +
  'The typeIds you see in getAsset output is read-only — it shows the full inheritance chain.\n\n' +
  PROPS_FORMAT +
  '\n\n' +
  ASSETPROPVALUE_TYPES +
  '\n\n' +
  '⚠ IMPORTANT: Before creating or modifying any complex block type, you MUST first read the full block specification.\n' +
  'Blocks with complex internal structures: props, table, gallery, checklist, block-mirror, script, diagram, textgrid, markdown, leveleditor.\n' +
  'Do not guess their format — always read the spec first.\n\n' +
  ERROR_RECOVERY;

const DELETE_ASSET_DESC =
  'Permanently delete an asset from the project.\n\n' +
  'BEFORE DELETING: Consider calling getAsset to verify you have the correct asset. ' +
  'If the request is not explicit (e.g. user just says "remove something"), confirm with the user first.\n\n' +
  ERROR_RECOVERY;

const GET_ASSET_DESC =
  'Get the full content of a specific asset by ID, including all blocks with their props, inherited values, and computed values.\n\n' +
  'USE THIS TOOL:\n' +
  '- Before modifying an asset with changeAsset (to see current state)\n' +
  "- When answering questions about a specific asset's content\n" +
  '- To understand the block structure of a parent type before creating a typed asset\n\n' +
  'RESPONSE FORMAT:\n' +
  '- id, name, title, icon — asset identifiers\n' +
  '- workspaceId — which workspace contains this asset\n' +
  '- typeIds — list of all ancestor asset IDs in the inheritance chain (read-only)\n' +
  '- parentIds — direct parent assets (used for inheritance)\n' +
  '- blocks[] — each block has:\n' +
  '  - id, type, name, title — block identifiers\n' +
  '  - props — properties set directly on this block (own values)\n' +
  '  - inherited — properties inherited from parent type assets (null if block is own)\n' +
  '  - computed — final resolved values (inherited + own + formula results). USE THIS for reading data.\n\n' +
  ERROR_RECOVERY;

const LIST_ASSETS_DESC =
  'List all assets in the project with their basic info (id, title, name, workspaceId, typeIds). ' +
  'Use this to discover asset IDs before calling getAsset or changeAsset.\n\n' +
  'For large projects, prefer searchAssets to filter by workspace or text query.';

const SEARCH_ASSETS_DESC =
  'Search and filter assets in the project. Returns matching assets with basic info (id, title, name, workspaceId, typeIds).\n\n' +
  'FILTERS (all optional — combine to narrow results):\n' +
  '- workspaceId: filter assets in a specific workspace (use listWorkspaces to find IDs)\n' +
  '- query: text search in asset title and name\n' +
  '- typeIds: filter assets that inherit from a specific parent type ID\n\n' +
  'When no filters are provided, behaves like listAssets (returns all).\n\n' +
  ERROR_RECOVERY;

const CREATE_WORKSPACE_DESC =
  'Create a new workspace (folder) in the project.\n\n' +
  '🔴 IMPORTANT RULE — WHEN TO USE COLLECTION WORKSPACES:\n' +
  'If this workspace is intended to hold assets of a SPECIFIC TYPE (Characters, Locations, Scripts, GameObjects, etc.), ' +
  'you MUST create it as a COLLECTION workspace by setting the "props" parameter.\n' +
  'A regular folder without collection props will NOT filter assets by type.\n\n' +
  'How to create a collection workspace:\n' +
  '"props": {"type": "collection", "asset": {"AssetId": "<typeAssetId>", "Title": "<typeName>"}}\n\n' +
  'Examples:\n' +
  '- Workspace for Characters: {"title": "Characters", "parentId": "...", "props": {"type": "collection", "asset": {"AssetId": "00000000-0000-0000-0000-000000000011", "Title": "Character"}}}\n' +
  '- Workspace for Locations: {"title": "Locations", "parentId": "...", "props": {"type": "collection", "asset": {"AssetId": "00000000-0000-0000-0000-000000000012", "Title": "Location"}}}\n' +
  '- Workspace for Scripts: {"title": "Scripts", "parentId": "...", "props": {"type": "collection", "asset": {"AssetId": "00000000-0000-0000-0000-000000000033", "Title": "Script"}}}\n\n' +
  'Use listWorkspaces to see existing workspaces and their structure before creating.\n\n' +
  ERROR_RECOVERY;

const LIST_WORKSPACES_DESC =
  'List all workspaces (folders) in the project with their hierarchy (id, title, name, parentId) and props. ' +
  'Use this to find workspace IDs for creating assets or workspaces. ' +
  'A workspace with props {"type":"collection","asset":{...}} is a collection that holds assets of a specific type.';

// ── Return types ──────────────────────────────────────────────────────────────

export type CreateAssetResult =
  | {
      success: true;
      asset: { id: string; title: string | null; name: string | null };
      changeId: string | null;
    }
  | { success: false; error: string };

export type ChangeAssetResult =
  | { success: true; assetId: string; changeId: string | null }
  | { success: false; error: string };

export type DeleteAssetResult =
  | { success: true; deleted: boolean; changeId: string | null }
  | { success: false; error: string };

export type GetAssetResult = Record<string, any> | null;

export type ListAssetsResult = {
  total: number;
  assets: Pick<
    AssetShort,
    'id' | 'title' | 'name' | 'workspaceId' | 'typeIds'
  >[];
};

export type SearchAssetsResult = {
  total: number;
  assets: Pick<
    AssetShort,
    'id' | 'title' | 'name' | 'workspaceId' | 'typeIds'
  >[];
};

export type ListWorkspacesResult = {
  total: number;
  workspaces: Pick<Workspace, 'id' | 'title' | 'name' | 'parentId' | 'props'>[];
};

export type CreateWorkspaceResult =
  | {
      success: true;
      workspace: { id: string; title: string; parentId: string | null };
    }
  | { success: false; error: string };

// ── AiProjectTools class ──────────────────────────────────────────────────────

export class AiProjectTools {
  constructor(private db: IProjectDatabase) {}

  get tools(): AiToolDef[] {
    return [
      this._createAsset,
      this._changeAsset,
      this._deleteAsset,
      this._getAsset,
      this._listAssets,
      this._searchAssets,
      this._createWorkspace,
      this._listWorkspaces,
    ];
  }

  get createAsset(): AiToolDef {
    return this._createAsset;
  }
  get changeAsset(): AiToolDef {
    return this._changeAsset;
  }
  get deleteAsset(): AiToolDef {
    return this._deleteAsset;
  }
  get getAsset(): AiToolDef {
    return this._getAsset;
  }
  get listAssets(): AiToolDef {
    return this._listAssets;
  }
  get searchAssets(): AiToolDef {
    return this._searchAssets;
  }
  get createWorkspace(): AiToolDef {
    return this._createWorkspace;
  }
  get listWorkspaces(): AiToolDef {
    return this._listWorkspaces;
  }

  // ── createAsset ─────────────────────────────────────────────────────────

  private get _createAsset(): AiToolDef {
    return {
      name: 'createAsset',
      description: CREATE_ASSET_DESC,
      inputSchema: {
        title: z.string(),
        workspaceId: z.string().optional(),
        parentId: z.string().optional(),
        name: z.string().nullable().optional(),
        blocks: blocksArraySchema,
      },
      handler: async (args) => {
        const title = args.title as string;
        const name = args.name as string | null | undefined;
        const parentId = args.parentId as string | undefined;
        const blocks = args.blocks as any[] | undefined;
        let workspaceId = args.workspaceId as string | null | undefined;

        try {
          if (!workspaceId) {
            const result = await this.db.workspacesGet({
              where: { names: ['gdd'] },
            });
            workspaceId = result.list[0]?.id ?? null;
          }

          let blocksMap: Record<string, any> | undefined;
          if (blocks && blocks.length > 0) {
            blocksMap = {};
            let index = 1;
            for (const block of blocks) {
              blocksMap[block.name ?? `@${uuidv4()}`] = {
                type: block.type,
                props: block.props,
                index,
              };
              index++;
            }
          }

          const result = await this.db.assetsCreate({
            set: {
              title,
              name: name ?? null,
              workspaceId: workspaceId ?? null,
              parentIds: parentId ? [parentId] : [],
              blocks: blocksMap as any,
            },
          });

          const assetId = result.ids[0];
          return {
            success: true as const,
            asset: { id: assetId, title, name: name ?? null },
            changeId: result.changeId ?? null,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false as const, error: msg };
        }
      },
    };
  }

  // ── changeAsset ──────────────────────────────────────────────────────────

  private get _changeAsset(): AiToolDef {
    return {
      name: 'changeAsset',
      description: CHANGE_ASSET_DESC,
      inputSchema: {
        id: z.string(),
        title: z.string().optional(),
        name: z.string().nullable().optional(),
        parentId: z.string().optional(),
        workspaceId: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        isAbstract: z.boolean().optional(),
        blocks: blocksMapSchema,
      },
      handler: async (args) => {
        const id = args.id as string;
        const title = args.title as string | undefined;
        const name = args.name as string | null | undefined;
        const parentId = args.parentId as string | undefined;
        const workspaceId = args.workspaceId as string | null | undefined;
        const icon = args.icon as string | null | undefined;
        const isAbstract = args.isAbstract as boolean | undefined;
        const blocks = args.blocks as any;

        try {
          const set: Record<string, unknown> = {};
          if (title !== undefined) set.title = title;
          if (name !== undefined) set.name = name;
          if (parentId !== undefined) set.parentIds = [parentId];
          if (workspaceId !== undefined) set.workspaceId = workspaceId;
          if (icon !== undefined) set.icon = icon;
          if (isAbstract !== undefined) set.isAbstract = isAbstract;
          if (blocks !== undefined) set.blocks = blocks;

          const result = await this.db.assetsChange({ set, where: { id } });

          return {
            success: true as const,
            assetId: id,
            changeId: result.changeId ?? null,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false as const, error: msg };
        }
      },
    };
  }

  // ── deleteAsset ──────────────────────────────────────────────────────────

  private get _deleteAsset(): AiToolDef {
    return {
      name: 'deleteAsset',
      description: DELETE_ASSET_DESC,
      inputSchema: {
        id: z.string(),
      },
      handler: async (args) => {
        const id = args.id as string;

        try {
          const result = await this.db.assetsDelete({ id });
          return {
            success: true as const,
            deleted: result.ids.length > 0,
            changeId: result.changeId ?? null,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false as const, error: msg };
        }
      },
    };
  }

  // ── getAsset ──────────────────────────────────────────────────────────────

  private get _getAsset(): AiToolDef {
    return {
      name: 'getAsset',
      description: GET_ASSET_DESC,
      inputSchema: {
        id: z.string(),
      },
      handler: async (args) => {
        const id = args.id as string;

        try {
          const assets = await this.db.assetsGetFull({ where: { id } });
          const asset = assets.objects.assetFulls?.[id];
          if (!asset) return null;

          return {
            id: asset.id,
            name: asset.name,
            title: asset.title,
            icon: asset.icon,
            workspaceId: asset.workspaceId,
            typeIds: asset.typeIds,
            parentIds: asset.parentIds,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            blocks: (asset.blocks ?? []).map((b: any) => ({
              id: b.id,
              type: b.type,
              name: b.name,
              title: b.title,
              props: b.props,
              inherited: b.inherited,
              computed: b.computed,
            })),
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Error getting asset: ${msg}`);
        }
      },
    };
  }

  // ── listAssets ───────────────────────────────────────────────────────────

  private get _listAssets(): AiToolDef {
    return {
      name: 'listAssets',
      description: LIST_ASSETS_DESC,
      inputSchema: {},
      handler: async () => {
        try {
          const assets = await this.db.assetsGetShort({ where: {} });
          return {
            total: assets.total,
            assets: assets.list.map((a) => ({
              id: a.id,
              title: a.title,
              name: a.name,
              workspaceId: a.workspaceId,
              typeIds: a.typeIds,
            })),
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Error listing assets: ${msg}`);
        }
      },
    };
  }

  // ── searchAssets ─────────────────────────────────────────────────────────

  private get _searchAssets(): AiToolDef {
    return {
      name: 'searchAssets',
      description: SEARCH_ASSETS_DESC,
      inputSchema: {
        workspaceId: z.string().optional(),
        query: z.string().optional(),
        typeIds: z.array(z.string()).optional(),
      },
      handler: async (args) => {
        const workspaceId = args.workspaceId as string | undefined;
        const query = args.query as string | undefined;
        const typeIds = args.typeIds as string[] | undefined;

        try {
          const where: Record<string, any> = {};
          if (workspaceId) where.workspaceId = workspaceId;
          if (query) where.query = query;

          let assets = await this.db.assetsGetShort({ where });

          if (typeIds && typeIds.length > 0) {
            assets = {
              ...assets,
              list: assets.list.filter((a) =>
                typeIds.some((tid) => a.typeIds?.includes(tid)),
              ),
            };
          }

          return {
            total: assets.list.length,
            assets: assets.list.map((a) => ({
              id: a.id,
              title: a.title,
              name: a.name,
              workspaceId: a.workspaceId,
              typeIds: a.typeIds,
            })),
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Error searching assets: ${msg}`);
        }
      },
    };
  }

  // ── createWorkspace ──────────────────────────────────────────────────────

  private get _createWorkspace(): AiToolDef {
    return {
      name: 'createWorkspace',
      description: CREATE_WORKSPACE_DESC,
      inputSchema: {
        title: z.string(),
        parentId: z.string().optional(),
        index: z.number().nullable().optional(),
        props: z.record(z.string(), z.unknown()).optional(),
      },
      handler: async (args) => {
        const title = args.title as string;
        const parentId = args.parentId as string | undefined;
        const index = args.index as number | null | undefined;
        const props = args.props as Record<string, unknown> | undefined;

        try {
          const ws = await this.db.workspacesCreate({
            title,
            parentId: parentId ?? null,
            index: index ?? null,
            props: props as any,
          });

          return {
            success: true as const,
            workspace: { id: ws.id, title: ws.title, parentId: ws.parentId },
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false as const, error: msg };
        }
      },
    };
  }

  // ── listWorkspaces ───────────────────────────────────────────────────────

  private get _listWorkspaces(): AiToolDef {
    return {
      name: 'listWorkspaces',
      description: LIST_WORKSPACES_DESC,
      inputSchema: {},
      handler: async () => {
        try {
          const result = await this.db.workspacesGet({ where: {} });

          return {
            total: result.total,
            workspaces: result.list.map((w) => ({
              id: w.id,
              title: w.title,
              name: w.name,
              parentId: w.parentId,
              props: JSON.parse(JSON.stringify(w.props)),
            })),
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Error listing workspaces: ${msg}`);
        }
      },
    };
  }
}
