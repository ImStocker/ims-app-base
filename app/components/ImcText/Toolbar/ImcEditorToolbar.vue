<template>
  <div class="ImcEditorToolbar">
    <div
      v-for="group of grouppedToolsMain"
      :key="group.section"
      class="ImcEditorToolbar-section"
    >
      <component
        :is="tool.component"
        v-for="tool of group.main"
        :key="tool.name"
        class="ImcEditorToolbar-button"
        :project="project"
        :quill="quill"
        :tool="tool"
        :selection="selection"
        :change-epoch="changeEpoch"
        v-bind="tool.componentProps"
      ></component>
    </div>
    <div class="ImcEditorToolbar-section">
      <component
        :is="lastUsedAdditionalTool.component"
        v-if="lastUsedAdditionalTool"
        class="ImcEditorToolbar-button"
        :project="project"
        :quill="quill"
        :tool="lastUsedAdditionalTool"
        :selection="selection"
        :change-epoch="changeEpoch"
        v-bind="lastUsedAdditionalTool.componentProps"
      ></component>
      <menu-button
        v-model:shown="moreDropdownShown"
        class="ImcEditorToolbar-more"
      >
        <template #button="{ toggle }">
          <button class="is-button is-button-toolbar" @click="toggle">
            <i class="ri-more-2-fill ImcEditorToolbar-button-icon"></i>
          </button>
        </template>
        <div class="ImcEditorToolbar-more-dropdown">
          <template
            v-for="group of grouppedToolsSecondary"
            :key="group.section"
          >
            <component
              :is="tool.component"
              v-for="tool of group.secondary"
              :key="tool.name"
              class="ImcEditorToolbar-more-button"
              :project="project"
              :quill="quill"
              :tool="tool"
              :selection="selection"
              :change-epoch="changeEpoch"
              :expanded="true"
              v-bind="tool.componentProps"
              @used="moreToolUsed(tool)"
            ></component>
          </template>
        </div>
      </menu-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarSection, ImcToolbarTool } from './ImcToolbarTools';
import { ImcToolbarTools } from './ImcToolbarTools';
import MenuButton from '../../Common/MenuButton.vue';
import type Quill from 'quill';
import UiPreferenceManager from '../../../logic/managers/UiPreferenceManager';
import type { ProjectInfoForLink } from '../../../logic/router/routes-helpers';
import UiManager from '../../../logic/managers/UiManager';

type GroupedToolSection = {
  section: ImcToolbarSection;
  main: ImcToolbarTool[];
  secondary: ImcToolbarTool[];
};

export default defineComponent({
  name: 'ImcEditorToolbar',
  components: {
    MenuButton,
  },
  props: {
    quill: {
      type: Object as PropType<Quill>,
      required: true,
    },
    project: {
      type: [Object, null] as PropType<ProjectInfoForLink | null>,
      required: true,
    },
  },
  data() {
    return {
      selection: null as { index: number; length: number } | null,
      changeEpoch: 0,
      moreDropdownShown: false,
    };
  },
  computed: {
    screenSize() {
      return this.$getAppManager().get(UiManager).screenSize;
    },
    lastUsedAdditionalToolName: {
      get() {
        return this.$getAppManager()
          .get(UiPreferenceManager)
          .getPreference<string>('ImcEditorToolbar-lastUsedTool-adv', 'clean');
      },
      set(val: string) {
        this.$getAppManager()
          .get(UiPreferenceManager)
          .setPreference('ImcEditorToolbar-lastUsedTool-adv', val);
      },
    },
    lastUsedAdditionalTool(): ImcToolbarTool | null {
      return (
        ImcToolbarTools.find(
          (t) => t.name === this.lastUsedAdditionalToolName,
        ) ?? null
      );
    },
    grouppedTools(): GroupedToolSection[] {
      const groups = new Map<ImcToolbarSection, GroupedToolSection>();
      const list: GroupedToolSection[] = [];
      for (const tool of ImcToolbarTools) {
        let group = groups.get(tool.section);
        if (!group) {
          group = {
            section: tool.section,
            main: [],
            secondary: [],
          };
          list.push(group);
          groups.set(tool.section, group);
        }
        if (
          tool.main === 1 ||
          ((this.screenSize === 'pc' || this.screenSize === 'tb') &&
            tool.main === 2)
        ) {
          group.main.push(tool);
        } else {
          group.secondary.push(tool);
        }
      }
      return list;
    },
    grouppedToolsMain() {
      return this.grouppedTools.filter((g) => g.main.length > 0);
    },
    grouppedToolsSecondary() {
      return this.grouppedTools.filter((g) => g.secondary.length > 0);
    },
  },
  mounted() {
    (this as any)._editorChangeHandler = (eventName) => {
      if (eventName === 'selection-change') {
        this.selection = this.quill.getSelection();
      } else if (eventName === 'text-change') {
        this.changeEpoch++;
      }
    };
    this.quill.on('editor-change', (this as any)._editorChangeHandler);
    this.selection = this.quill.getSelection();
  },
  unmounted() {
    this.quill.off('editor-change', (this as any)._editorChangeHandler);
  },
  methods: {
    moreToolUsed(tool: ImcToolbarTool) {
      this.lastUsedAdditionalToolName = tool.name;
      this.moreDropdownShown = false;
    },
  },
});
</script>

<style lang="scss" scoped>
@use './ImcEditorToolbar.scss';

.ImcEditorToolbar {
  display: inline-flex;
  @include ImcEditorToolbar.ImcEditorToolbar-toolbar;

  &:deep(.is-button-toolbar) {
    @include ImcEditorToolbar.ImcEditorToolbar-button;
  }
}

.ImcEditorToolbar-more-dropdown {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown;

  &:deep(.is-button-toolbar) {
    @include ImcEditorToolbar.ImcEditorToolbar-button;
  }
}

.ImcEditorToolbar-section {
  @include ImcEditorToolbar.ImcEditorToolbar-section;
}
.ImcEditorToolbar-more {
  display: flex;
}

.ImcEditorToolbar-more-button {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown-item;
}
</style>
