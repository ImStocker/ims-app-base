<template>
  <span
    class="CaptionString"
    :title="displayingTitle ? displayingTitle : undefined"
    >{{ displayingText }}</span
  >
</template>

<script>
import { convertTranslatedTitle } from '../../logic/utils/assets';
export default {
  name: 'CaptionString',
  components: {},
  props: {
    value: {
      type: String,
      default: () => '',
    },
    title: {
      type: String,
      default: () => '',
    },
  },
  computed: {
    displayingText() {
      return convertTranslatedTitle(this.value, (key) => this.$t(key));
    },
    displayingTitle() {
      return convertTranslatedTitle(this.title, (key) => this.$t(key));
    },
  },
};
</script>

<style lang="scss" scoped></style>
