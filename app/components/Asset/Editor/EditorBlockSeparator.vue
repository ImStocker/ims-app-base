<template>
  <div
    class="EditorBlockSeparator"
    @mouseenter.prevent="handleMouseEnter($event)"
    @mouseleave.prevent="handleMouseLeave($event)"
    @click="handleClick($event)"
  >
    <template v-if="!disabled">
      <div
        class="EditorBlockSeparator-inner createHeader"
        :class="{ show: showCreateHeader, hide: !showCreateHeader }"
      >
        <div class="EditorBlockSeparator-icon">
          <i class="ri-heading"></i>
        </div>
        <div
          class="EditorBlockSeparator-line"
          :class="{ show: showLine }"
        ></div>
      </div>
      <div
        class="EditorBlockSeparator-inner createBlock"
        :class="{ show: showCreateBlock, hide: !showCreateBlock }"
      >
        <add-block-dropdown
          class="EditorBlockSeparator-createBlock-dropdown"
          @click="createBlock($event)"
        >
          <div class="EditorBlockSeparator-inner-2">
            <div class="EditorBlockSeparator-icon">
              <i class="ri-add-circle-fill"></i>
            </div>
          </div>
        </add-block-dropdown>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import AddBlockDropdown from './AddBlockDropdown.vue';
import { getBetweenIndexWithTimestamp } from './blockUtils';
import { AssetRights } from '../../../logic/types/Rights';

export default defineComponent({
  name: 'EditorBlockSeparator',
  components: {
    AddBlockDropdown,
  },
  props: {
    item: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    fromListEdge: {
      type: String as PropType<'top' | 'bottom' | null>,
      default: null,
    },
    prevItemIndex: {
      type: Number as PropType<number | null>,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    allowAddBlocks: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['create-block', 'create-title'],
  data() {
    return {
      freezeState: false,
      enteredFromDirection: null as null | 'bottom' | 'top',
    };
  },
  computed: {
    showCreateHeader() {
      return (
        this.enteredFromDirection === 'bottom' &&
        !this.item.title &&
        !this.item.name &&
        this.fromListEdge !== 'bottom' &&
        this.item.rights > AssetRights.READ_ONLY
      );
    },
    showCreateBlock() {
      return (
        ((this.enteredFromDirection === 'top' && this.fromListEdge !== 'top') ||
          (this.enteredFromDirection === 'bottom' && this.item.title)) &&
        this.allowAddBlocks
      );
    },
    showLine() {
      return this.freezeState;
    },
  },
  methods: {
    createTitle() {
      this.$emit('create-title', this.item.id);
    },
    createBlock(block_type: string) {
      if (this.prevItemIndex !== null) {
        const current_item_index = this.item.index;
        const prev_item_index = this.prevItemIndex;
        const new_index = getBetweenIndexWithTimestamp(
          prev_item_index,
          current_item_index,
        );
        this.$emit('create-block', { blockType: block_type, index: new_index });
      } else if (this.fromListEdge === 'bottom') {
        this.$emit('create-block', { blockType: block_type });
      } else if (this.fromListEdge === 'top') {
        const current_item_index = this.item.index;
        const timestamp = parseFloat('0.' + Date.now());
        const new_index = current_item_index - 1 - timestamp;
        this.$emit('create-block', { blockType: block_type, index: new_index });
      }
    },
    handleClick(_evt: MouseEvent) {
      if (this.showCreateHeader) {
        this.createTitle();
      }
    },
    handleMouseEnter(evt: MouseEvent) {
      clearTimeout((this as any)._unfreezeStateTimeout);
      (this as any)._freezeStateTimeout = setTimeout(() => {
        if (this.showCreateBlock || this.showCreateHeader) {
          this.freezeState = true;
        }
      }, 300);

      const element_rect = (evt.target as HTMLElement).getBoundingClientRect();
      const topDist = Math.abs(element_rect.top - evt.clientY);
      const bottomDist = Math.abs(element_rect.bottom - evt.clientY);
      const min = Math.min(topDist, bottomDist);

      if (this.freezeState) {
        return;
      }
      switch (min) {
        case topDist: {
          this.enteredFromDirection = 'top';
          break;
        }
        case bottomDist: {
          this.enteredFromDirection = 'bottom';
          break;
        }
      }
    },
    handleMouseLeave(_evt: MouseEvent) {
      clearTimeout((this as any)._freezeStateTimeout);
      (this as any)._unfreezeStateTimeout = setTimeout(() => {
        this.freezeState = false;
        this.enteredFromDirection = null;
      }, 300);

      if (!this.freezeState) {
        this.enteredFromDirection = null;
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.EditorBlockSeparator {
  display: flex;
  align-items: center;
  margin: 0px 7px;
  height: 12px;
  position: relative;
}

.EditorBlockSeparator-inner,
.EditorBlockSeparator-inner-2 {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 4px;
  align-items: center;
  cursor: text;
  position: absolute;

  &.show {
    .EditorBlockSeparator-icon {
      opacity: 1;
    }
  }

  &.hide {
    cursor: default;
    pointer-events: none;

    .EditorBlockSeparator-icon {
      opacity: 0;
    }
  }
}

.EditorBlockSeparator-line {
  width: 100%;
  height: 2px;
  background-color: var(--text-intense);
  opacity: 0;
  transition: opacity 0.2s;

  &.show {
    opacity: 1;
  }
}

.EditorBlockSeparator-icon {
  font-size: 12px;
  line-height: 12px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.EditorBlockSeparator-createBlock-dropdown {
  width: 100%;
  height: 12px !important;
}
</style>
