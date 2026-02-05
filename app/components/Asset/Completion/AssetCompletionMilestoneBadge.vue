<template>
  <div class="AssetCompletionMilestoneBadge" :title="fullTitle">
    {{ shortTitle }}
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { AssetPropValueEnum } from '../../../logic/types/Props';

import { convertTranslatedTitle } from '../../../logic/utils/assets';
import { capitalizeFirstLetter } from '../../../logic/utils/stringUtils';

export default defineComponent({
  name: 'AssetCompletionMilestoneBadge',
  components: {},
  props: {
    milestone: {
      type: Object as PropType<AssetPropValueEnum>,
      required: true,
    },
    maxLength: {
      type: Number,
      default: 16,
    },
  },
  computed: {
    shortTitle() {
      const name = convertTranslatedTitle(this.milestone.Title, (...args) =>
        this.$t(...args),
      );
      if (name.length <= this.maxLength) {
        return name;
      }
      const splitted = name
        .split(' ')
        .filter((n) => n)
        .map((n) => capitalizeFirstLetter(n));
      let attempt = splitted.join(' ');
      for (let i = 0; i < splitted.length; i++) {
        if (attempt.length <= this.maxLength) {
          return attempt;
        }
        attempt = '';
        for (let j = 0; j < splitted.length; j++) {
          if (j <= i && !/^\d+$/.test(splitted[j])) {
            attempt += splitted[j][0];
          } else {
            attempt += splitted[j];
          }
        }
      }
      return attempt.slice(0, this.maxLength);
    },
    fullTitle() {
      const name = convertTranslatedTitle(this.milestone.Title, (...args) =>
        this.$t(...args),
      );
      return this.$t('boardPage.plan.milestoneHoverName', {
        name,
      });
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AssetCompletionMilestoneBadge {
  font-size: 11px;
  padding: 1px 2px;
  border-radius: 4px;
  background: var(--color-accent);
  color: #000;
  white-space: nowrap;
  display: inline-block;
}
</style>
