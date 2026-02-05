<template>
  <div class="SelectAssetIconDropdownContent is-dropdown">
    <FormSearch
      class="SelectAssetIconDropdownContent-search"
      :value="searchText"
      :autofocus="true"
      @change="searchText = $event"
    ></FormSearch>
    <div v-if="filteredIcons.length"
      class="SelectAssetIconDropdownContent-icons tiny-scrollbars use-buttons-dropdown-item"
    >
        <button
          v-for="icon in filteredIcons"
          :key="icon.name"
          class="is-button"
          :title="`${$tTitle(icon.title)} (${icon.name})`"
          @click="$emit('input', icon.name)"
        >
          <i
            :class="[
              'asset-icon-' + icon.name,
              'SelectAssetIconDropdownContent-icon',
              value === icon.name ? 'selected' : null,
            ]"
          ></i>
        </button>
    </div>
    <span v-else class="SelectAssetIconDropdownContent-noResults">
      {{ $t('gddPage.menu.noResults') }}
    </span>
    <div v-if="value" class="SelectAssetIconDropdownContent-manage">
      <button
        class="is-button is-button-action danger"
        @click="$emit('input', null)"
      >
        <i class="ri-delete-bin-line"></i>
        <span>{{ $t('assetSettings.deleteIcon') }}</span>
      </button>
    </div>
  </div>
</template>
<script lang="ts" type="text/ecmascript-6">
import { defineComponent } from 'vue';
import FormSearch from '../Form/FormSearch.vue';
import { AssetIcons } from './asset-icons';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  name: 'SelectAssetIconDropdownContent',
  components: {
    FormSearch,
  },
  props: {
    value: {
      type: String,
      default: null,
    },
  },
  emits: ['input'],
  data() {
    return {
      searchText: '' as string,
    };
  },
  computed: {
    icons() {
      return AssetIcons;
    },
    filteredIcons() {
      if (this.searchText) {
        const search_words = this.searchText
          .split(' ')
          .map((x) => x.trim().toLowerCase())
          .filter((x) => x);

        return this.icons.filter((el) => {
          const keywords_lower = [
            convertTranslatedTitle(el.title, (...args) =>
              this.$t(...args),
            ).toLowerCase(),
            el.name.replace(/-fill$/g, '').toLowerCase(),
            ...el.keywords.map((k) => k.toLowerCase()),
          ];
          return keywords_lower.some((keyword) => {
            return search_words.some((sw) => keyword.includes(sw));
          });
        });
      }
      return this.icons;
    },
  },
});
</script>
<style lang="scss" scoped>
@use '$style/asset-icons';

.SelectAssetIconDropdownContent {
  padding: var(--dropdown-padding);
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-width: 100%;
  width: 540px;
}
.SelectAssetIconDropdownContent-icons {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  overflow: auto;
  padding-top: 5px;

  .is-button {
    border-radius: 4px;
  }
}
.SelectAssetIconDropdownContent-icon {
  @include asset-icons.asset-icons;
  font-size: 24px;

  &.selected {
    color: var(--color-accent);
  }
}
.SelectAssetIconDropdownContent-noResults {
  font-style: italic;
  color: var(--local-sub-text-color);
  text-align: center;
  width: 100%;
}
</style>
