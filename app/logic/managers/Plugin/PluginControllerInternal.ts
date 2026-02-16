import type { BlockTypeDefinition } from '../../types/BlockTypeDefinition';
import type { FieldTypeController } from '../../types/FieldTypeController';
import type { IAppManager } from '../IAppManager';
import type { SegmentEntity } from '../LocalFsSyncManager';
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
  activate(appManager: IAppManager): Promise<() => Promise<void>>;
};

export type PluginContentDescriptorModule = PluginContentDescriptorBase<
  'module',
  PluginContentDescriptorModuleContent
>;

export default class PluginControllerInternal extends PluginControllerBase {
  constructor(appManager: IAppManager, pluginDescriptor: PluginDescriptor) {
    super(appManager);
    this._pluginDescriptor = pluginDescriptor;
  }
}
