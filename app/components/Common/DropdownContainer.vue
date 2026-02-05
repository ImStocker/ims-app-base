<template>
  <Teleport v-if="hostEl" :to="hostEl">
    <div
      ref="container"
      class="DropdownContainer"
      v-bind="$attrs"
      :style="containerStyleComp"
      @vue:mounted="_containerMounted"
      @vue:beforeUnmount="_containerBeforeUnmount"
    >
      <slot :attached-bounding-box="targetBoundingBoxComp"></slot>
    </div>
  </Teleport>
</template>

<script lang="ts" type="text/ecmascript-6">
import { type PropType, defineComponent } from 'vue';
import {
  trackElementBounds,
  type TrackElementBoundsHandler,
} from '../../logic/utils/trackElementBounds';
import { debounceForThis } from '../utils/ComponentUtils';
import {
  trackElementSize,
  type TrackElementSizeHandler,
} from '../../logic/utils/trackElementSize';
import { assignLogicalParent } from '../utils/logical-tree';

export type DropdownContainerPlacement = 'left' | 'right' | 'top' | 'bottom';
export type DropdownContainerAlign = 'start' | 'center' | 'end';

type DropdownContainerCalcCoords = {
  left?: number;
  top?: number;
  bottom?: number;
  right?: number;
};

export default defineComponent({
  name: 'DropdownContainer',
  components: {},

  inject: ['getDropdownHost'],
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
      type: String as PropType<DropdownContainerPlacement>,
      default: 'bottom',
    },
    alignPosition: {
      type: String as PropType<DropdownContainerAlign>,
      default: 'start',
    },
    edgeMargin: {
      type: Number,
      default: 10,
    },
  },
  data() {
    return {
      originalParent: null as HTMLElement | null,
      targetBoundingBox: null as DOMRect | null,
      targetTracker: null as TrackElementBoundsHandler | null,
      containerTracker: null as TrackElementSizeHandler | null,
      containerCalcCoords: {} as DropdownContainerCalcCoords,
      containerSize: null as { width: number; height: number } | null,
      placementInProcess: false,
      resultPlacementPosition: 'bottom' as DropdownContainerPlacement,
      hostEl: null as HTMLElement | null,
      initialPlaced: false,
    };
  },
  computed: {
    dropdownContainerFreeHeight() {
      if (!this.targetBoundingBoxComp) return 0;
      let top: number | undefined;
      if (this.containerCalcCoords.top !== undefined) {
        top = this.containerCalcCoords.top;
      } else if (this.containerCalcCoords.bottom !== undefined) {
        top =
          this.containerCalcCoords.bottom - (this.containerSize?.height ?? 0);
      }
      return top !== undefined ? window.innerHeight - top - this.edgeMargin : 0;
    },
    dropdownContainerFreeWidth() {
      if (!this.targetBoundingBoxComp) return 0;
      const win_size_without_scrollbar = window.document.body.clientWidth;
      let left: number | undefined;
      if (this.containerCalcCoords.left !== undefined) {
        left = this.containerCalcCoords.left;
      } else if (this.containerCalcCoords.right !== undefined) {
        left =
          this.containerCalcCoords.right - (this.containerSize?.width ?? 0);
      }
      return left !== undefined
        ? win_size_without_scrollbar - left - this.edgeMargin
        : 0;
    },
    targetComp() {
      if (this.attachToElement) return this.attachToElement;
      else return this.originalParent;
    },
    targetBoundingBoxComp() {
      if (this.attachToRect) return this.attachToRect;
      else return this.targetBoundingBox;
    },
    altAttachPosition(): DropdownContainerPlacement {
      let res: DropdownContainerPlacement;
      switch (this.attachPosition) {
        case 'bottom':
          res = 'top';
          break;
        case 'top':
          res = 'bottom';
          break;
        case 'left':
          res = 'right';
          break;
        case 'right':
          res = 'left';
          break;
      }
      return res;
    },
    containerStyleComp() {
      const res: Record<string, string> = {};
      if (this.containerCalcCoords.left !== undefined) {
        res.left = this.containerCalcCoords.left + 'px';
      }
      if (this.containerCalcCoords.top !== undefined) {
        res.top = this.containerCalcCoords.top + 'px';
      }
      if (this.containerCalcCoords.right !== undefined) {
        res.right = this.containerCalcCoords.right + 'px';
      }
      if (this.containerCalcCoords.bottom !== undefined) {
        res.bottom = this.containerCalcCoords.bottom + 'px';
      }
      if (this.targetBoundingBoxComp) {
        res['--DropdownContainer-attachToElement-width'] =
          this.targetBoundingBoxComp.width + 'px';
        res['--DropdownContainer-attachToElement-height'] =
          this.targetBoundingBoxComp.height + 'px';
        res['--DropdownContainer-attachToElement-left'] =
          this.targetBoundingBoxComp.left + 'px';
        res['--DropdownContainer-attachToElement-top'] =
          this.targetBoundingBoxComp.top + 'px';
        res['--DropdownContainer-attachToElement-right'] =
          this.targetBoundingBoxComp.right + 'px';
        res['--DropdownContainer-attachToElement-bottom'] =
          this.targetBoundingBoxComp.bottom + 'px';
        if (!this.placementInProcess) {
          res['--DropdownContainer-freeHeight'] =
            this.dropdownContainerFreeHeight + 'px';
          res['--DropdownContainer-freeWidth'] =
            this.dropdownContainerFreeWidth + 'px';
        }
      }
      if (!this.initialPlaced) {
        res['visibility'] = 'hidden';
      }
      return res;
    },
  },
  mounted() {
    this.originalParent = this.$el.parentElement;
    this.hostEl = this.getDropdownHost
      ? (this.getDropdownHost as any)()
      : window.document.body; // Set after mounted to save originalParent
    this._updateListeners(true);
  },
  unmounted() {
    this._updateListeners(false);
    this.originalParent = null;
  },
  methods: {
    _containerMounted() {
      if (this.$refs['container']) {
        assignLogicalParent(
          this.$refs['container'] as HTMLElement,
          this.targetComp,
        );
      }
      this._updateListeners(true);
    },
    _containerBeforeUnmount() {
      if (this.$refs['container']) {
        assignLogicalParent(this.$refs['container'] as HTMLElement, null);
      }
      this._updateListeners(true);
    },
    _updateListeners(reset: boolean) {
      if (this.targetTracker) {
        this.targetTracker.cancel();
        this.targetTracker = null;
      }
      if (this.containerTracker) {
        this.containerTracker.cancel();
        this.containerTracker = null;
      }
      if (reset) {
        if (this.targetComp && !this.attachToRect) {
          this.targetTracker = trackElementBounds(this.targetComp, (bbox) => {
            this.targetBoundingBox = bbox;
          });
        }
        if (this.$refs['container']) {
          this.containerTracker = trackElementSize(
            this.$refs['container'] as HTMLElement,
            (value) => {
              this.containerSize = value;
              this.updateDropdownPosition();
            },
            false,
          );
        }
      }
    },
    async updateDropdownPositionNow() {
      if (this.placementInProcess) {
        return;
      }
      this.placementInProcess = true;
      try {
        let success = await this._placeDropdownContainer(this.attachPosition);
        if (!success) {
          success = await this._placeDropdownContainer(this.altAttachPosition);
        }
        if (!success) {
          success = await this._placeDropdownContainer(this.attachPosition);
        }
        if (!success) {
          this.resultPlacementPosition = this.attachPosition;
        }
      } finally {
        this.placementInProcess = false;
        this.initialPlaced = true;
      }
    },
    updateDropdownPosition: debounceForThis(async function (this: any) {
      this.updateDropdownPositionNow();
    }, 1),
    async _placeDropdownContainer(
      place: DropdownContainerPlacement,
    ): Promise<boolean> {
      let container = this.$refs['container'] as HTMLElement | undefined;
      if (!container) {
        await this.$nextTick();
        container = this.$refs['container'] as HTMLElement | undefined;
        if (!container) {
          return false;
        }
      }

      let container_rect = container.getBoundingClientRect();
      this.containerSize = {
        width: container_rect.width,
        height: container_rect.height,
      };
      let cc: DropdownContainerCalcCoords = {};

      const place_horizontally = () => {
        if (!this.targetBoundingBoxComp) return;
        const win_size_without_scrollbar = window.document.body.clientWidth;

        switch (this.alignPosition) {
          case 'start':
            cc.left = this.targetBoundingBoxComp.left;
            break;
          case 'center':
            cc.left =
              (this.targetBoundingBoxComp.left +
                this.targetBoundingBoxComp.right -
                container_rect.width) /
              2;
            break;
          case 'end':
            cc.right =
              window.document.documentElement.clientWidth -
              this.targetBoundingBoxComp.left;
            break;
        }

        const res_left_coord =
          cc.left !== undefined
            ? cc.left
            : win_size_without_scrollbar -
              (cc.right ?? 0) -
              container_rect.width;
        const res_right_coord =
          cc.left !== undefined
            ? cc.left + container_rect.width
            : win_size_without_scrollbar - (cc.right ?? 0);

        const left_overflow = this.edgeMargin - res_left_coord;
        if (left_overflow > 0) {
          if (cc.left !== undefined) {
            cc.left += left_overflow;
          } else {
            if (cc.right === undefined) cc.right = 0;
            cc.right = Math.max(cc.right - left_overflow, this.edgeMargin);
          }
        }
        const right_overflow =
          res_right_coord - (win_size_without_scrollbar - this.edgeMargin);
        if (right_overflow > 0) {
          if (cc.left !== undefined) {
            cc.left = Math.max(cc.left - right_overflow, this.edgeMargin);
          } else {
            if (cc.right === undefined) cc.right = 0;
            cc.right += right_overflow;
          }
        }
      };

      const place_vertically = () => {
        if (!this.targetBoundingBoxComp) return;

        switch (this.alignPosition) {
          case 'start':
            cc.top = this.targetBoundingBoxComp.top;
            break;
          case 'center':
            cc.top =
              (this.targetBoundingBoxComp.top +
                this.targetBoundingBoxComp.bottom -
                container_rect.height) /
              2;
            break;
          case 'end':
            cc.bottom = window.innerHeight - this.targetBoundingBoxComp.top;
            break;
        }

        const res_top_coord =
          cc.top !== undefined
            ? cc.top
            : window.innerHeight - (cc.bottom ?? 0) - container_rect.height;
        const res_bottom_coord =
          cc.top !== undefined
            ? cc.top + container_rect.height
            : window.innerHeight - (cc.bottom ?? 0);

        const top_overflow = this.edgeMargin - res_top_coord;
        if (top_overflow > 0) {
          if (cc.top !== undefined) {
            cc.top += top_overflow;
          } else {
            if (cc.bottom === undefined) cc.bottom = 0;
            cc.bottom = Math.max(cc.bottom - top_overflow, this.edgeMargin);
          }
        }
        const bottom_overflow =
          res_bottom_coord - (window.innerHeight - this.edgeMargin);
        if (bottom_overflow > 0) {
          if (cc.top !== undefined) {
            cc.top = Math.max(cc.top - bottom_overflow, this.edgeMargin);
          } else {
            if (cc.bottom === undefined) cc.bottom = 0;
            cc.bottom += bottom_overflow;
          }
        }
      };

      const apply_position = () => {
        this.containerCalcCoords = cc;
        cc = { ...cc };
      };

      if (this.targetBoundingBoxComp) {
        switch (place) {
          case 'bottom':
            place_horizontally();
            cc.top = this.targetBoundingBoxComp.bottom;
            break;
          case 'left':
            cc.right =
              window.document.documentElement.clientWidth -
              this.targetBoundingBoxComp.left;
            place_vertically();
            break;
          case 'top':
            place_horizontally();
            cc.bottom = window.innerHeight - this.targetBoundingBoxComp.top;
            break;
          case 'right':
            cc.left = this.targetBoundingBoxComp.right;
            place_vertically();
            break;
        }
      }
      apply_position();

      if (!this.targetBoundingBoxComp) {
        return false;
      }
      await this.$nextTick();

      const win_size_without_scrollbar = window.document.body.clientWidth;

      container_rect = container.getBoundingClientRect();
      this.containerSize = {
        width: container_rect.width,
        height: container_rect.height,
      };
      const left_overflow = this.edgeMargin - container_rect.left;
      const top_overflow = this.edgeMargin - container_rect.top;
      const right_overflow =
        container_rect.right - (win_size_without_scrollbar - this.edgeMargin);
      const bottom_overflow =
        container_rect.bottom - (window.innerHeight - this.edgeMargin);

      if (left_overflow > 0 && place === 'left') return false;
      else if (top_overflow > 0 && place === 'top') return false;
      else if (right_overflow > 0 && place === 'right') return false;
      else if (bottom_overflow > 0 && place === 'bottom') return false;

      if (place === 'top' || place === 'bottom') {
        if (left_overflow > 0 || right_overflow > 0) {
          place_horizontally();
          apply_position();
        }
      } else if (place === 'left' || place === 'right') {
        if (top_overflow > 0 || bottom_overflow > 0) {
          place_vertically();
          apply_position();
        }
      }

      this.resultPlacementPosition = place;
      return true;
    },
  },
  watch: {
    targetComp() {
      if (this.$refs['container']) {
        assignLogicalParent(
          this.$refs['container'] as HTMLElement,
          this.targetComp,
        );
      }
      this._updateListeners(true);
    },
    attachToRect() {
      this._updateListeners(true);
    },
    targetBoundingBoxComp() {
      this.updateDropdownPosition();
    },
  },
});
</script>

<style lang="scss" scoped>
.DropdownContainer {
  position: fixed;
  z-index: 3000;
  max-width: 100%;
}
</style>
