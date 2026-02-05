<template>
  <dropdown-container
    v-if="innerShown"
    class="DropdownElement"
    :attach-to-element="targetComp"
    :attach-to-rect="attachToRect"
    :attach-position="attachPosition"
    :align-position="alignPosition"
  >
    <div
      ref="inner"
      class="DropdownElement-inner"
      @vue:mounted="innerMounted"
      @vue:beforeUnmount="innerBeforeUnmount"
    >
      <slot></slot>
    </div>
  </dropdown-container>
</template>

<script lang="ts" type="text/ecmascript-6">
import { type PropType, defineComponent } from 'vue';
import DropdownContainer, {
  type DropdownContainerAlign,
} from './DropdownContainer.vue';
import { logicalTreeContains } from '../utils/logical-tree';
import type {
  DropdownElementHideTrigger,
  DropdownElementPlacement,
} from '../../logic/types/DropdownElement';

export default defineComponent({
  name: 'DropdownElement',
  components: {
    DropdownContainer,
  },
  props: {
    attachToElement: {
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
    attachToRect: {
      type: Object as PropType<DOMRect | null>,
      default: null,
    },
    attachPosition: {
      type: String as PropType<DropdownElementPlacement>,
      default: 'bottom',
    },
    alignPosition: {
      type: String as PropType<DropdownContainerAlign>,
      default: 'start',
    },
    shown: {
      type: Boolean,
      default: false,
    },
    hideTrigger: {
      type: String as PropType<DropdownElementHideTrigger>,
      default: 'clickOutside',
    },
  },
  emits: ['show', 'hide', 'update:shown'],
  data() {
    return {
      innerShown: this.shown,
      originalParent: null as HTMLElement | null,
    };
  },
  computed: {
    targetComp() {
      if (this.attachToElement) return this.attachToElement;
      else return this.originalParent;
    },
  },
  watch: {
    shown() {
      if (this.innerShown !== this.shown) {
        this.innerShown = this.shown;
      }
    },
    innerShown() {
      if (this.innerShown !== this.shown) {
        this.$emit('update:shown', this.innerShown);
      }
      if (this.innerShown) {
        this.$emit('show');
      } else {
        this.$emit('hide');
      }
    },
  },
  mounted() {
    this.originalParent = this.$el.parentElement;
  },
  unmounted() {
    this.originalParent = null;
  },
  methods: {
    innerMounted() {
      setTimeout(() => {
        if (this.innerShown) {
          this.resetListeners(true);
        }
      }, 1);
    },
    innerBeforeUnmount() {
      this.resetListeners(false);
    },
    show() {
      this.innerShown = true;
    },
    hide() {
      this.innerShown = false;
    },
    toggle() {
      this.innerShown = !this.innerShown;
    },
    resetListeners(init: boolean) {
      if ((this as any)._clickOutside) {
        window.removeEventListener('click', (this as any)._clickOutside, false);
        window.removeEventListener(
          'contextmenu',
          (this as any)._clickOutside,
          false,
        );
        (this as any)._clickOutside = null;
      }
      if (init && this.innerShown) {
        if (
          this.hideTrigger === 'clickOutside' ||
          this.hideTrigger === 'clickOutsideAttached'
        ) {
          (this as any)._clickOutside = (e: MouseEvent) => {
            if (!this.$refs['inner']) return;

            if (
              !logicalTreeContains(
                this.$refs['inner'] as HTMLElement,
                e.target as Element,
              )
            ) {
              if (
                this.hideTrigger === 'clickOutsideAttached' &&
                this.targetComp
              ) {
                if (
                  !logicalTreeContains(this.targetComp, e.target as Element)
                ) {
                  this.hide();
                }
              } else {
                this.hide();
              }
            }
          };
          window.addEventListener(
            'contextmenu',
            (this as any)._clickOutside,
            false,
          );
          window.addEventListener('click', (this as any)._clickOutside, false);
        }
      }
    },
  },
});
</script>
<style lang="scss" scoped></style>
