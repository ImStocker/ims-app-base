<template>
  <div class="FeedLoader">
    <slot></slot>
    <visibility-trigger :threshold="0.1" @trigger="changeIntersecting" />
    <div v-if="isLoading" class="FeedLoader-loader">
      <div class="loaderSpinner FeedLoader-spinner"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import VisibilityTrigger from './VisibilityTrigger.vue';
import UiManager from '../../logic/managers/UiManager';
import { debounceForThis } from '../utils/ComponentUtils';

export default defineComponent({
  title: 'FeedLoader',
  components: {
    VisibilityTrigger,
  },
  props: {
    loadMore: {
      type: Function,
      required: true,
    },
    hasMore: {
      type: Boolean,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:isLoading'],
  data() {
    return {
      isIntersecting: false,
      isLoading: false,
    };
  },
  mounted() {
    this.loadDelayed();
  },
  methods: {
    changeIntersecting(isIntersecting: boolean) {
      this.isIntersecting = isIntersecting;
    },
    loadDelayed: debounceForThis(function (this: any) {
      this.load();
    }),
    async load() {
      if (this.hasMore && !this.isLoading && !this.disabled) {
        try {
          this.isLoading = true;
          await this.loadMore();
          setTimeout(() => {
            if (this.isIntersecting) {
              this.loadDelayed();
            }
          }, 250);
        } catch (err) {
          this.$getAppManager().get(UiManager).showError(err);
        } finally {
          this.isLoading = false;
        }
      }
    },
  },
  watch: {
    isIntersecting() {
      if (this.isIntersecting) {
        this.loadDelayed();
      }
    },
    disabled() {
      if (!this.disabled) {
        this.loadDelayed();
      }
    },
    isLoading() {
      this.$emit('update:isLoading', this.isLoading);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.FeedLoader-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  font-size: 20px;
}
</style>
