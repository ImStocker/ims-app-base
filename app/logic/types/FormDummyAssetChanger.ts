import { AssetChanger } from './AssetChanger';
import type { AssetProps } from './Props';
import { AssetRights } from './Rights';

export class FormDummyAssetChanger {
  changer: AssetChanger;
  blockId = 'dummy';
  assetId = 'dummy';
  originalState: AssetProps;

  constructor(originalState: AssetProps) {
    this.changer = new AssetChanger(async () => {
      return { originals: [] };
    });
    this.originalState = originalState;
  }

  getCurrentState(): AssetProps {
    const changes = this.changer.applyChanges({
      projectId: 'dummy',
      blocks: [
        {
          computed: this.originalState,
          createdAt: '',
          id: this.blockId,
          index: 0,
          inherited: null,
          name: null,
          own: true,
          ownTitle: '',
          props: this.originalState,
          title: '',
          type: 'props',
          updatedAt: '',
        },
      ],
      createdAt: '',
      creatorUserId: '',
      deletedAt: null,
      icon: null,
      id: this.assetId,
      index: 0,
      isAbstract: false,
      name: null,
      ownIcon: null,
      ownTitle: '',
      parentIds: [],
      references: [],
      rights: AssetRights.FULL_ACCESS,
      title: '',
      typeIds: [],
      updatedAt: '',
      workspaceId: null,
      hasImage: false,
    });
    return changes.blocks.find((b) => b.id === this.blockId)?.props ?? {};
  }
}
