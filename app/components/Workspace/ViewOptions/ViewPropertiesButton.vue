<template>
  <menu-button v-model:shown="dropdownShown" class="ViewPropertiesButton">
    <template #button="{ toggle }">
      <button
        ref="button"
        class="is-button ViewPropertiesButton-button"
        :class="{ focus: dropdownShown }"
        @click="toggle()"
      >
        <div v-if="!saved" class="ViewPropertiesButton-unsaved"></div>
        <i class="ri-list-unordered"></i>
        <caption-string :value="$t('viewSettings.properties')">
        </caption-string>
      </button>
    </template>
    <view-properties-box
      ref="selectViewPropertiesBox"
      :view-props="viewProperties"
      class="is-dropdown"
      @update:list="changeList($event)"
    >
      <template v-if="userRole" #append>
        <button
          class="is-button is-button-dropdown-item ViewPropertiesButton-create-new-button"
          @click="saveView()"
        >
          <i class="ri-save-3-line"></i>
          {{ $t('viewSettings.saveView') }}
        </button>
      </template>
    </view-properties-box>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';
import MenuButton from '../../Common/MenuButton.vue';
import ViewPropertiesBox from './ViewPropertiesBox.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { WorkspaceCollectionPageVM } from '../../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type {
  WorkspaceCollectionColumn,
  ViewProperty,
} from '../../GameDesign/WorkspaceCollectionContent';
import type { UserViewProp } from './viewUtils';

export default defineComponent({
  name: 'ViewPropertiesButton',
  components: {
    CaptionString,
    MenuButton,
    ViewPropertiesBox,
  },
  props: {
    vm: {
      type: Object as PropType<UnwrapRef<WorkspaceCollectionPageVM>>,
      required: true,
    },
    columns: {
      type: Array<WorkspaceCollectionColumn>,
      required: true,
    },
    modelValue: {
      type: Array<UserViewProp>,
      required: true,
    },
    saved: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['change:viewProps', 'save:viewProps'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
    viewProperties(): ViewProperty[] {
      const cols_with_index: [ViewProperty, number][] = this.columns.map(
        (col) => {
          const selected_index = this.modelValue.findIndex(
            (p) => p.prop === col.propKey,
          );
          return [
            {
              prop: {
                prop: col.propKey,
                width:
                  selected_index >= 0
                    ? this.modelValue[selected_index].width
                    : null,
              },
              title: col.propTitle,
              isSelected: selected_index >= 0,
            },
            selected_index >= 0 ? selected_index : this.modelValue.length,
          ];
        },
      );
      cols_with_index.sort((a, b) => a[1] - b[1]);
      return cols_with_index.map((c) => c[0]);
    },
  },
  methods: {
    saveView() {
      this.$emit('save:viewProps');
      this.dropdownShown = false;
    },
    changeList(reordered_properties: ViewProperty[]) {
      this.$emit(
        'change:viewProps',
        reordered_properties.filter((p) => p.isSelected).map((p) => p.prop),
      );
    },
  },
});
</script>

<style lang="scss" scoped>
.ViewPropertiesButton-unsaved {
  width: 9px;
  height: 9px;
  background-color: var(--color-main-yellow);
  border-radius: 999px;
  border: 1px solid var(--color-main-yellow);
  position: absolute;
  top: 3px;
  right: 3px;
}
.ViewPropertiesButton-create-new-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
</style>
