<template>
  <menu-button
    v-model:shown="dropdownShown"
    class="ViewOptionButton"
    @show="dropdownShownHandler()"
  >
    <template #button="{ toggle }">
      <button
        ref="button"
        class="is-button ViewOptionButton-button"
        :class="{ 'state-open': dropdownShown, 'state-unsaved': !saved }"
        @click="toggle()"
      >
        <div v-if="!saved" class="ViewOptionButton-unsaved"></div>
        <i
          :class="{
            'ri-arrow-up-down-line': propName === 'sort',
            'ri-filter-line': propName === 'filter',
          }"
        ></i>
        <caption-string :value="$t('viewSettings.' + propName)">
        </caption-string>
      </button>
    </template>
    <view-option-box
      :columns="columns"
      :model-value="modelValue"
      :prop-name="propName"
      class="is-dropdown ViewOptionButton-dropdown"
      @update:list="changeList($event)"
    >
      <template v-if="userRole" #append>
        <button
          class="is-button is-button-dropdown-item ViewOptionButton-create-new-button"
          @click="saveView()"
        >
          <i class="ri-save-3-line"></i>
          {{ $t('viewSettings.saveView') }}
        </button>
      </template>
    </view-option-box>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';
import MenuButton from '../../Common/MenuButton.vue';
import ViewOptionBox from './ViewOptionBox.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { WorkspaceCollectionPageVM } from '../../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { WorkspaceCollectionColumn } from '../../GameDesign/WorkspaceCollectionContent';
import type { UserViewSort, UserViewFilter } from './viewUtils';
export default defineComponent({
  name: 'ViewOptionButton',
  components: {
    CaptionString,
    MenuButton,
    ViewOptionBox,
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
      type: Array<UserViewSort | UserViewFilter>,
      required: true,
    },
    propName: {
      type: String,
      required: true,
    },
    saved: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['save:viewProps', 'change:viewProps'],
  data() {
    return {
      dropdownShown: false,
    };
  },
  computed: {
    userRole() {
      return this.$getAppManager().get(ProjectManager).getUserRoleInProject();
    },
  },
  methods: {
    async dropdownShownHandler() {
      await new Promise((res) => setTimeout(res, 10));
    },
    saveView() {
      this.$emit('save:viewProps');
      this.dropdownShown = false;
    },
    changeList(reordered_sorts: (UserViewSort | UserViewFilter)[]) {
      this.$emit('change:viewProps', reordered_sorts);
    },
  },
});
</script>

<style lang="scss" scoped>
@use './viewToolbarButton';

.ViewOptionButton {
  @include viewToolbarButton.view-toolbar-buttons('ViewOptionButton');
}
.ViewOptionButton-dropdown {
  max-width: 400px;
}
.ViewOptionButton-create-new-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
</style>
