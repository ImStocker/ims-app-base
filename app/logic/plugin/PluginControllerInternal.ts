import type { SegmentEntity } from '#logic/project-sub-contexts/LocalFsSyncSubContext';
import type { BlockTypeDefinition } from '#logic/types/BlockTypeDefinition';
import type { FieldTypeController } from '#logic/types/FieldTypeController';
import type { IProjectContext } from '#logic/types/IProjectContext';
import PluginControllerBase, {
  type PluginContentDescriptorBase,
  type PluginDescriptor,
} from './PluginControllerBase';

type PluginContentDescriptorBlockContent = {
  definition: BlockTypeDefinition;
};

export type PluginContentDescriptorBlock = PluginContentDescriptorBase<
  'block',
  PluginContentDescriptorBlockContent
>;

type PluginContentDescriptorFieldContent = {
  controller: FieldTypeController;
};

export type PluginContentDescriptorField = PluginContentDescriptorBase<
  'field',
  PluginContentDescriptorFieldContent
>;

type PluginContentDescriptorExportSegmentContent = SegmentEntity;

export type PluginContentDescriptorExportSegment = PluginContentDescriptorBase<
  'segment',
  PluginContentDescriptorExportSegmentContent
>;

type PluginContentDescriptorModuleContent = {
  activate(projectContext: IProjectContext): Promise<() => Promise<void>>;
};

export type PluginContentDescriptorModule = PluginContentDescriptorBase<
  'module',
  PluginContentDescriptorModuleContent
>;

export default class PluginControllerInternal extends PluginControllerBase {
  constructor(
    projectContext: IProjectContext,
    pluginDescriptor: PluginDescriptor,
  ) {
    super(projectContext);
    this._pluginDescriptor = pluginDescriptor;
  }
}
