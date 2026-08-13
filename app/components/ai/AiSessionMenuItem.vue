<template>
  <li class="MenuList-item use-buttons-dropdown-item AiSessionMenuItem">
    <button class="is-button MenuList-item-inner" @click="item.action">
      <div class="MenuList-item-inner-label">{{ item.title }}</div>
    </button>
    <div class="AiSessionMenuItem-actions use-buttons-icon-small">
      <button
        class="is-button AiSessionMenuItem-btn"
        :title="t('aiAssistant.renameSession')"
        @click.stop="item.params?.onRename?.()"
      >
        <i class="ri-pencil-line" />
      </button>
      <span v-if="item.params?.isSelected" class="AiSessionMenuItem-checkmark">
        <i class="ri-check-line" />
      </span>
      <button
        v-else-if="item.params?.canDelete"
        class="is-button AiSessionMenuItem-btn AiSessionMenuItem-btn--danger"
        :title="t('aiAssistant.deleteSession')"
        @click.stop="item.params?.onDelete?.()"
      >
        <i class="ri-delete-bin-line" />
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useI18n } from '#imports';
import type { MenuListItem } from '#logic/types/MenuList';

defineProps({
  item: {
    type: Object as PropType<MenuListItem>,
    required: true,
  },
});

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.AiSessionMenuItem {
  display: flex;
  justify-content: space-between;
}

.AiSessionMenuItem-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 5px;
}

.AiSessionMenuItem-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
}

.AiSessionMenuItem-btn--danger {
  color: var(--color-danger, #e53935) !important;
}

.AiSessionMenuItem-checkmark {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 2px 4px;
  color: var(--color-accent);
}

.MenuList-item-inner-label {
  text-align: left;
  text-wrap: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
