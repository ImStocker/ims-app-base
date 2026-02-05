<template>
  <div class="AssetPageContentsTable">
    <div class="AssetPageContentsTable-header">
      {{ $t('translatedTitles.Contents') }}:
    </div>
    <div
      ref="contentsTable"
      class="AssetPageContentsTable-table"
      :class="{ 'has-mask': isMaskActive }"
      @scroll="onContentsScroll"
    >
      <div
        v-for="item in contentsTableWithAnchors"
        :key="item.itemId"
        class="AssetPageContentsTable-block-item"
      >
        <div
          class="AssetPageContentsTable-block-pointer"
          :class="{ show: isCurrentItem(item) }"
        >
          <i class="ri-arrow-right-s-fill"></i>
        </div>
        <a
          class="AssetPageContentsTable-block-item-link"
          :class="['level-' + item.level]"
          :href="getItemHref(item)"
          @click.prevent="openAnchor(item)"
        >
          <caption-string :value="item.title ?? ''"></caption-string>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import CaptionString from '../../Common/CaptionString.vue';
import { getCurrentUrl } from '../../../logic/router/routes-helpers';
import type { BlockContentItem } from '../../../logic/types/BlockTypeDefinition';
import { makeAnchorTagId } from '../../../logic/utils/assets';
import EditorManager from '../../../logic/managers/EditorManager';

export default defineComponent({
  name: 'AssetPageContentsTable',
  components: {
    CaptionString,
  },
  props: {
    contentsTable: {
      type: Array<BlockContentItem<any>>,
      required: true,
    },
    currentAnchorTagId: {
      type: [String, null],
      default: null,
    },
    assetId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isMaskActive: false,
    };
  },
  computed: {
    currentHref() {
      const url = getCurrentUrl();
      return url.origin + url.pathname;
    },
    contentsTableWithAnchors() {
      return this.contentsTable.filter((item) => item.anchor !== undefined);
    },
  },
  watch: {
    contentsTable() {
      this.$nextTick(() => {
        this._checkMaskActive();
      });
    },
  },
  mounted() {
    this._checkMaskActive();
  },
  methods: {
    _checkMaskActive() {
      if (!this.$refs.contentsTable) return;
      const el = this.$refs.contentsTable as HTMLElement;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
      this.isMaskActive = !atBottom;
    },
    onContentsScroll() {
      this._checkMaskActive();
    },
    openAnchor(item: BlockContentItem<any>) {
      if (item.anchor === undefined) return null;
      this.$getAppManager()
        .get(EditorManager)
        .openAsset(this.assetId, 'self', item.blockId, item.anchor);
    },
    getItemHref(item: BlockContentItem<any>) {
      if (item.anchor === undefined) return undefined;
      const url = new URL(getCurrentUrl());
      url.hash = '#' + makeAnchorTagId(item.blockId, item.anchor);
      return url.toString();
    },
    isCurrentItem(item: BlockContentItem<any>) {
      if (!this.currentAnchorTagId) return false;
      return (
        this.currentAnchorTagId === makeAnchorTagId(item.blockId, item.anchor)
      );
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins';

.AssetPageContentsTable {
  color: var(--local-sub-text-color);
  text-align: right;
  margin-top: 15px;
  padding-right: 10px;
  display: flex;
  flex-direction: column;

  .AssetPageContentsTable-header {
    font-size: var(--local-font-size);
    font-weight: 700;
  }

  .AssetPageContentsTable-table {
    display: flex;
    flex-direction: column;
    gap: 5px;
    line-height: var(--local-line-height-thin);
    max-height: 80vh;
    overflow: auto;
    scrollbar-gutter: stable;
    scrollbar-width: none;
  }

  .AssetPageContentsTable-table.has-mask {
    mask-image: linear-gradient(rgb(0 0 0 / 100%), 92.5%, transparent);
    padding-bottom: 80px;
  }

  .AssetPageContentsTable-block-item {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 5px;

    .AssetPageContentsTable-block-pointer {
      color: var(--local-sub-text-color);
      opacity: 0;

      &.show {
        opacity: 1;
      }
    }

    .AssetPageContentsTable-block-item-link {
      color: var(--local-sub-text-color);
      text-decoration: none;
      line-height: 1.2em;

      :deep(.CaptionString) {
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        display: -webkit-box;
        overflow: hidden;
        text-align: right;
        text-overflow: ellipsis;
      }

      &:hover {
        text-decoration: underline;
      }

      &.level-1 {
        font-size: 14px;
      }

      &.level-2 {
        font-size: 12px;
      }

      &.level-3 {
        font-size: 12px;
      }

      &.level-4 {
        font-size: 11px;
      }
    }
  }
}
</style>
