<template>
  <ims-input
    ref="formSearchInput"
    v-model="searchText"
    class="FormSearch"
    :placeholder="$t('gddPage.menu.search') + '...'"
    :autofocus="autofocus"
  >
    <template #append>
      <i v-if="searchText === ''" class="ri-search-line FormSearch-icon" />
      <i v-else class="ri-close-fill FormSearch-icon" @click="clear()"></i>
    </template>
  </ims-input>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';
import { debounceForThis } from '../utils/ComponentUtils';
import ImsInput from '../Common/ImsInput.vue';

export default defineComponent({
  title: 'FormSearch',
  components: {
    ImsInput,
  },
  props: {
    value: {
      type: String,
      required: true,
    },
    autofocus: {
      type: Boolean,
      default: () => false,
    },
  },
  emits: ['change'],
  data() {
    return {
      searchText: this.value,
    };
  },
  watch: {
    searchText() {
      this.emitChangeDelayed();
    },
  },
  methods: {
    emitChangeDelayed: debounceForThis(function (this: any) {
      this.emitChange();
    }, 300),
    emitChange() {
      if (this.searchText !== this.value) {
        this.$emit('change', this.searchText);
      }
    },
    focus() {
      if (!this.$refs.formSearchInput) return;
      (this.$refs.formSearchInput as InstanceType<typeof ImsInput>).focus();
    },
    clear() {
      this.searchText = '';
      this.emitChange();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormSearch-icon {
  color: var(--input-placeholder-color);
}
</style>
