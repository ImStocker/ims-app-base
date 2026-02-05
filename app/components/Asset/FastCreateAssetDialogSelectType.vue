<template>
  <div class="FastCreateAssetDialogSelectType">
    <ValueSwitcher
      v-if="!disableChangeType"
      v-model="baseParentOptSelected"
      class="FastCreateAssetDialogSelectType-Types"
      :options="baseParentOpts"
      value-prop="id"
    >
      <template #option="{ option, selected }">
        <div
          class="FastCreateAssetDialogSelectType-base-option"
          :title="option.id ? $t('asset.createTooltips.' + option.id) : ''"
        >
          <i
            v-if="option.icon"
            :class="['ri-' + option.icon]"
            class="FastCreateAssetDialogSelectType-base-option-icon"
          ></i>
          <caption-string
            v-if="!option.icon || selected"
            :value="option.title"
            class="FastCreateAssetDialogSelectType-parent-title"
          >
          </caption-string>
        </div>
      </template>
    </ValueSwitcher>
    <select-parent-asset
      :parent="disableChangeType ? parent : parentIsBaseOpt ? null : parent"
      :readonly="disableChangeType"
      :class="{
        selected: parent && !parentIsBaseOpt,
        // 'FastCreateAssetDialogSelectType-readonly': disableChangeType,
      }"
      class="FastCreateAssetDialogSelectType-parent"
      :placeholder="$t('asset.text')"
      :additional-options="additionalParentOpts"
      @select-parent="changeParent"
    ></select-parent-asset>
  </div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import CaptionString from '../Common/CaptionString.vue';
import SelectParentAsset from './SelectParentAsset.vue';
import type { AssetForSelection } from '../../logic/types/AssetsType';
import ValueSwitcher from '../Common/ValueSwitcher.vue';
import {
  ASSET_SELECTION_STRUCTURE,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_GAME_MECHANICS,
  ASSET_SELECTION_DIAGRAM,
  ASSET_SELECTION_SCRIPT,
  ASSET_SELECTION_LEVEL,
} from '../../logic/constants';

type ParentElement = {
  id: string;
  title: string | null;
  icon: string | null;
};

export default defineComponent({
  name: 'FastCreateAssetDialogSelectType',
  components: {
    CaptionString,
    SelectParentAsset,
    ValueSwitcher,
  },
  props: {
    disableChangeType: {
      type: Boolean,
      default: () => false,
    },
    parent: {
      type: Object as PropType<AssetForSelection | null>,
      required: false,
      default: null,
    },
  },
  emits: ['changeParent'],
  data() {
    return {};
  },
  computed: {
    currentIcon() {
      if (this.parent && this.parent.icon) {
        return this.parent.icon;
      }
      return this.parent ? 'file-fill' : null;
    },
    parentIsBaseOpt(): boolean | null {
      if (!this.parent) return null;
      return !!this.baseParentOpts.find((opt) => opt.id === this.parent?.id);
    },
    additionalParentOpts(): AssetForSelection[] {
      return [ASSET_SELECTION_STRUCTURE, ASSET_SELECTION_ENUM];
    },
    baseParentOptSelected: {
      get() {
        if (!this.parent) return '';
        else if (this.baseParentOpts.some((b) => b.id === this.parent?.id)) {
          return this.parent.id;
        } else return null;
      },
      set(val: string) {
        if (!val) {
          this.changeParent(null);
        } else {
          const opt = this.baseParentOpts.find((b) => b.id === val);
          if (opt) this.changeParent(opt);
        }
      },
    },
    baseParentOpts(): AssetForSelection[] {
      return [
        {
          id: '',
          title: this.$t('asset.empty'),
          icon: null,
          name: null,
        },
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_DIAGRAM,
        ASSET_SELECTION_SCRIPT,
        ASSET_SELECTION_LEVEL,
      ];
    },
  },
  mounted() {},
  methods: {
    changeParent(val: ParentElement | null) {
      this.$emit('changeParent', val);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

[data-theme='ims-dark'] {
  .FastCreateAssetDialogSelectType-parent {
    --input-bg-color: transparent;
    --input-border-color: rgba(255, 255, 255, 0.1);
  }
}

[data-theme='ims-light'] {
  .FastCreateAssetDialogSelectType-parent {
    --input-bg-color: transparent;
    --input-border-color: #cccccc;
  }
}

.FastCreateAssetDialogSelectType {
  display: flex;
  justify-content: space-between;
  align-items: center;

  @include devices-mixins.device-type(not-pc) {
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
  }
}

.FastCreateAssetDialogSelectType-parent {
  max-width: 150px;
  margin-left: auto;
}

.FastCreateAssetDialogSelectType-parent-link-icon {
  margin-right: 5px;
  @include asset-icons.asset-icons;
}

.FastCreateAssetDialogSelectType-parent-title {
  text-transform: none;
}

.FastCreateAssetDialogSelectType-parent-selected {
  margin-left: 10px;
  margin-right: 10px;
}
.FastCreateAssetDialogSelectType-readonly {
  max-width: 100%;
}
.FastCreateAssetDialogSelectType-Types {
  --ValueSwitcher-border-radius: 4px !important;
  flex-wrap: wrap;
  &:deep {
    .ValueSwitcher-item {
      --button-padding: 0.53em 10px;
    }
  }
}
.FastCreateAssetDialogSelectType-base-option-icon {
  margin-right: 5px;
  &:last-child {
    margin-right: 0;
  }
}
</style>
