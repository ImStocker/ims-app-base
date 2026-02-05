<template>
  <div class="AssetHistoryRow">
    <div class="AssetHistoryRow-header">
      <div class="AssetHistoryRow-date">
        {{ createdAt }}
      </div>
      <div class="AssetHistoryRow-content">
        {{ changeContent }}
      </div>
      <div class="AssetHistoryRow-user">
        <i class="ri-user-fill"></i>
        {{ historyRow.user.Name }}
      </div>
      <div class="AssetHistoryRow-menu">
        <menu-button class="AssetHistoryRow-menu-button">
          <menu-list :menu-list="menuList"></menu-list>
        </menu-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { formatDateTime } from '../../../logic/utils/format';
import type { AssetHistoryDTO } from '../../../logic/types/AssetHistory';
import { parseAssetNewBlockRef } from '../../../logic/types/Props';
import MenuButton from '../../Common/MenuButton.vue';
import UiManager from '../../../logic/managers/UiManager';
import MenuList from '../../Common/MenuList.vue';

export default defineComponent({
  name: 'AssetHistoryRow',
  components: {
    MenuButton,
    MenuList,
  },
  props: {
    historyRow: {
      type: Object as PropType<AssetHistoryDTO>,
      required: true,
    },
  },
  emits: ['rollbackChange', 'revertToState'],
  computed: {
    menuList() {
      return [
        {
          title: this.$t('assetHistory.rollbackChange'),
          icon: 'history',
          action: this.rollbackChange,
        },
        // TODO: IMPLEMENT THIS:
        // {
        //   title: this.$t('assetHistory.revertToState'),
        //   action: this.revertToState
        // }
      ];
    },
    createdAt() {
      return formatDateTime(
        this.historyRow.createdAt,
        this.$getAppManager().get(UiManager).getLanguage(),
      );
    },
    changeContent() {
      const changes: string[] = [];
      const redo = this.historyRow.redo;
      if (redo) {
        if (redo.title !== undefined || redo.name !== undefined) {
          changes.push(this.$t('assetHistory.assetRenamed'));
        }
        if (
          redo.icon !== undefined ||
          redo.isAbstract !== undefined ||
          redo.parentIds !== undefined
        ) {
          changes.push(this.$t('assetHistory.assetInfoChanged'));
        }
        if (redo.index !== undefined) {
          changes.push(this.$t('assetHistory.assetIndexChanged'));
        }
        if (redo.workspaceId !== undefined) {
          changes.push(this.$t('assetHistory.assetWorkspaceChanged'));
        }
        if (redo.delete) {
          changes.push(this.$t('assetHistory.assetDeleted'));
        }
        if (redo.restore) {
          changes.push(this.$t('assetHistory.assetRestored'));
        }
      }
      if (redo?.blocks) {
        for (const [block_ref, change] of Object.entries(redo.blocks)) {
          const parsed_block_ref = parseAssetNewBlockRef(block_ref);
          const block_caption = parsed_block_ref.blockName
            ? parsed_block_ref.blockName
            : parsed_block_ref.blockId;
          let is_created = false;
          if (change.delete) {
            changes.push(
              this.$t('assetHistory.blockDeleted', {
                block: block_caption,
              }),
            );
          } else if (change.reset) {
            changes.push(
              this.$t('assetHistory.blockReset', {
                block: block_caption,
              }),
            );
          } else if (change.name !== undefined || change.title !== undefined) {
            const undo = this.historyRow.undo?.blocks
              ? this.historyRow.undo?.blocks[block_ref]
              : undefined;
            if (undo && undo.delete) {
              is_created = true;
              changes.push(
                this.$t('assetHistory.blockCreated', {
                  block: block_caption,
                }),
              );
            } else {
              changes.push(
                this.$t('assetHistory.blockRenamed', {
                  block: block_caption,
                }),
              );
            }
          }
          if (!is_created) {
            if (change.index !== undefined) {
              changes.push(
                this.$t('assetHistory.blockIndexChanged', {
                  block: block_caption,
                }),
              );
            }
          }
          if (change.props) {
            changes.push(
              this.$t('assetHistory.blockChanged', {
                block: block_caption,
              }),
            );
          }
        }
      }
      return changes.join(', ');
    },
  },
  methods: {
    rollbackChange() {
      this.$emit('rollbackChange', this.historyRow.id);
    },
    revertToState() {
      this.$emit('revertToState', this.historyRow.id);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetHistoryRow {
  padding: 10px;
  background: var(--panel-bg-color);
  border-radius: 4px;
}

.AssetHistoryRow-header {
  display: flex;
  gap: 10px;
}

.AssetHistoryRow-content {
  flex: 1;
}

.AssetHistoryRow-date {
  color: var(--local-sub-text-color);
}

.AssetHistoryRow-user {
  color: var(--local-link-color);
}
</style>
