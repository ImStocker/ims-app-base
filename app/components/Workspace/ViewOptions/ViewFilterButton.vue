<template>
  <menu-button
    v-model:shown="dropdownShown"
    class="ViewFilterButton"
    @show="dropdownShownHandler()"
  >
    <template #button="{ toggle }">
      <button
        ref="button"
        class="is-button ViewFilterButton-button"
        :class="{ focus: dropdownShown }"
        @click="toggle()"
      >
        <div v-if="!saved" class="ViewFilterButton-unsaved"></div>
        <i
          :class="{
            'ri-filter-line': !modelValue,
            'ri-filter-fill': modelValue,
          }"
        ></i>
        <caption-string :value="$t('viewSettings.filter')"> </caption-string>
      </button>
    </template>
    <div class="ViewFilterButton-content is-dropdown">
      <div class="ViewFilterButton-content-editor">
        <project-tree-search
          class="SelectionPropEditor-input"
          :model-value="modelValue"
          :autofocus="true"
          @update:model-value="changeList($event)"
        ></project-tree-search>

        <div class="ViewFilterButton-additionalOptions">
          <button
            class="is-button is-button-dropdown-item ViewFilterButton-create-new-button"
            @click="saveView()"
          >
            <i class="ri-save-3-line"></i>
            {{ $t('viewSettings.saveView') }}
          </button>
        </div>
      </div>
    </div>
  </menu-button>
</template>
<script lang="ts">
import { defineComponent, type PropType, type UnwrapRef } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';
import MenuButton from '../../Common/MenuButton.vue';
import ProjectTreeSearch from '../../Asset/ProjectTree/ProjectTreeSearch.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { AssetPropValueSelection } from '../../../logic/types/Props';
import type { WorkspaceCollectionPageVM } from '../../../logic/vm/Workspace/WorkspaceCollectionPageVM';
import type { WorkspaceCollectionColumn } from '../../GameDesign/WorkspaceCollectionContent';

export default defineComponent({
  name: 'ViewFilterButton',
  components: {
    CaptionString,
    MenuButton,
    ProjectTreeSearch,
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
      type: [Object, null] as PropType<AssetPropValueSelection | null>,
      required: true,
    },
    saved: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['save:viewProps', 'change:viewProps', 'update:modelValue'],
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
    changeList(filter: AssetPropValueSelection | null) {
      this.$emit('change:viewProps', filter);
    },
  },
});
</script>

<style lang="scss" scoped>
.ViewFilterButton-dropdown {
  max-width: 400px;
}
.ViewFilterButton-content-editor,
.ViewFilterButton-content-buttons {
  padding: 10px 10px 5px;
}
.ViewFilterButton-content-editor {
  border-bottom: 1px solid var(--local-border-color);
}
.ViewFilterButton-content-buttons {
  display: flex;
  gap: 10px;
}
.ViewFilterButton-unsaved {
  width: 9px;
  height: 9px;
  background-color: var(--color-main-yellow);
  border-radius: 999px;
  border: 1px solid var(--color-main-yellow);
  position: absolute;
  top: 3px;
  right: 3px;
}
.ViewFilterButton-create-new-button {
  display: flex;
  gap: 5px;
  --button-padding: 5px 10px !important;
  --button-border-radius: 4px !important;
}
.ViewFilterButton-additionalOptions {
  border: none;
  border-top: 1px solid var(--local-text-color);
  padding-top: 5px;
  margin-top: 5px;
}
</style>
