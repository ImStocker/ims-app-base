<template>
  <menu-button v-model:shown="dropdownShown">
    <template #button="{ toggle }">
      <imc-editor-toolbar-button
        class="ImcEditorToolbarFormatLinkButton"
        :icon="tool.icon"
        :is-active="!!activeLinkValue || !!activeAssetValue"
        :title="$t('imcEditor.tools.' + tool.name)"
        :expanded="expanded"
        @click="toggle"
      ></imc-editor-toolbar-button>
    </template>
    <div class="ImcEditorToolbarFormatLinkButton-dropdown">
      <div
        v-if="project && assetLinkRootWorkspace"
        class="ImcEditorToolbarFormatLinkButton-section"
      >
        <button
          class="is-button is-button-toolbar"
          :title="$t('imcEditor.link.selectElement')"
          @click="addAssetLink"
        >
          <i class="ri-file-search-line"></i>
        </button>
      </div>
      <template v-if="activeAssetValue">
        <div class="ImcEditorToolbarFormatLinkButton-section">
          <asset-link
            v-if="project"
            class="ImcEditorToolbarFormatLinkButton-assetLink"
            :project="project"
            :asset="{
              id: activeAssetValue.value.AssetId,
              title: activeAssetValue.value.Title,
              icon: activeAssetValue.icon,
            }"
          ></asset-link>
          <template v-else>{{ activeAssetValue?.value?.Title }}</template>
        </div>
        <div class="ImcEditorToolbarFormatLinkButton-section">
          <button
            class="is-button is-button-toolbar danger"
            :title="$t('imcEditor.link.removeLink')"
            @click="resetFormat"
          >
            <i class="ri-link-unlink"></i>
          </button>
        </div>
      </template>
      <template v-else>
        <div class="ImcEditorToolbarFormatLinkButton-section">
          <input
            ref="linkInput"
            v-model="dirtyLinkValue"
            class="is-input ImcEditorToolbarFormatLinkButton-linkInput"
            :placeholder="$t('imcEditor.link.pasteLink')"
            :title="activeLinkValue ?? ''"
            @keydown.enter.prevent="applyLink()"
            @keydown.escape.prevent="dropdownShown = false"
          />
          <button
            class="is-button is-button-toolbar"
            :disabled="!linkValueSanitized"
            :title="$t('imcEditor.link.applyLink')"
            @click="applyLink()"
          >
            <i class="ri-check-fill"></i>
          </button>
        </div>
        <div
          v-if="dirtyLinkValue && activeLinkValue"
          class="ImcEditorToolbarFormatLinkButton-section"
        >
          <a
            v-if="linkValueSanitized"
            class="is-button is-button-toolbar"
            :title="$t('imcEditor.link.openLink')"
            :href="linkValueSanitized"
            target="_blank"
          >
            <i class="ri-external-link-fill"></i>
          </a>
          <button
            v-if="activeLinkValue"
            class="is-button is-button-toolbar danger"
            :title="$t('imcEditor.link.removeLink')"
            @click="resetFormat"
          >
            <i class="ri-link-unlink"></i>
          </button>
        </div>
      </template>
    </div>
  </menu-button>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ImcToolbarTool } from './ImcToolbarTools';
import ImcEditorToolbarButton from './ImcEditorToolbarButton.vue';
import type Quill from 'quill';
import MenuButton from '../../Common/MenuButton.vue';
import type { ImcAssetBlotData } from '../blots/ImcAssetBlot';
import {
  sanitizeProjectUrl,
  type ProjectInfoForLink,
} from '../../../logic/router/routes-helpers';
import AssetLink from '../../Asset/AssetLink.vue';
import DialogManager from '../../../logic/managers/DialogManager';
import SelectAssetDialog from '../../Asset/SelectAssetDialog.vue';
import ProjectManager from '../../../logic/managers/ProjectManager';
import type { ImcEditorModule } from '../ImcEditorModule';
import type { Router } from 'vue-router';
import { getQueryAssetPropsSelection } from '../../../logic/expression/filter/filterExpression';

export type ImcEditorToolbarFormatOption = {
  value: string;
  icon: string;
};

export default defineComponent({
  name: 'ImcEditorToolbarFormatLinkButton',
  components: {
    MenuButton,
    ImcEditorToolbarButton,
    AssetLink,
  },
  props: {
    quill: { type: Object as PropType<Quill>, required: true },
    project: {
      type: [Object, null] as PropType<ProjectInfoForLink | null>,
      required: true,
    },
    tool: { type: Object as PropType<ImcToolbarTool>, required: true },
    selection: {
      type: [Object, null] as PropType<{
        index: number;
        length: number;
      } | null>,
      required: true,
    },
    expanded: { type: Boolean, default: false },
    changeEpoch: { type: Number, default: 0 },
  },
  emits: ['used'],
  data() {
    return {
      activeLinkValue: null as null | string,
      activeAssetValue: null as null | ImcAssetBlotData,
      dirtyLinkValue: '',
      dropdownShown: false,
      savedSelection: null as {
        index: number;
        length: number;
      } | null,
    };
  },
  computed: {
    activeLinkValueComp() {
      return this.getActiveLinkValue();
    },
    activeAssetValueComp() {
      return this.getActiveAssetValue();
    },
    linkValueSanitized(): string | null {
      if (!this.dirtyLinkValue) return null;

      if (/^(https?|mailto|tel|sms):\/\//.test(this.dirtyLinkValue)) {
        return this.dirtyLinkValue;
      }

      const project_link = this.project
        ? sanitizeProjectUrl(
            this.$router as Router,
            this.project,
            this.dirtyLinkValue,
          )
        : null;
      if (project_link) return project_link;

      return null;
    },
    assetLinkRootWorkspace() {
      const gdd_workspace = this.$getAppManager()
        .get(ProjectManager)
        .getWorkspaceByName('gdd');
      return gdd_workspace;
    },
  },
  watch: {
    activeLinkValueComp(val) {
      this.activeLinkValue = val;
    },
    activeAssetValueComp(val) {
      this.activeAssetValue = val;
    },
    changeEpoch() {
      this.activeLinkValue = this.getActiveLinkValue();
      this.activeAssetValue = this.getActiveAssetValue();
    },
    activeLinkValue() {
      this.dirtyLinkValue = this.activeLinkValue ?? '';
    },
    selection() {
      if (!this.dropdownShown) {
        this.savedSelection = this.selection;
      }
    },
    async dropdownShown() {
      if (this.dropdownShown) {
        await new Promise((res) => setTimeout(res, 10));
        if (this.$refs.linkInput) {
          (this.$refs.linkInput as HTMLInputElement).focus();
          (this.$refs.linkInput as HTMLInputElement).select();
        }
      }
    },
  },
  mounted() {
    this.savedSelection = this.selection;
    this.activeLinkValue = this.getActiveLinkValue();
    this.activeAssetValue = this.getActiveAssetValue();
  },
  methods: {
    getActiveLinkValue(): string | null {
      if (!this.savedSelection) return null;
      const format = this.quill.getFormat(this.savedSelection ?? undefined);
      return format['link'] as string;
    },
    getActiveAssetValue(): null | ImcAssetBlotData {
      if (!this.savedSelection) return null;
      const format = this.quill.getFormat(this.savedSelection ?? undefined);
      return (format['asset'] ?? null) as null | ImcAssetBlotData;
    },
    resetFormat() {
      this.quill.format('link', false);
      this.quill.format('asset', false);
    },
    applyLink() {
      if (!this.linkValueSanitized) return;
      const selection = this.savedSelection;
      this.quill.focus();
      this.quill.setSelection(selection);
      this.quill.format('asset', false);
      this.quill.format('link', this.dirtyLinkValue);
      this.$emit('used');
      this.dropdownShown = false;
    },
    async addAssetLink() {
      const imceditor = this.quill.getModule('imceditor') as ImcEditorModule;
      if (!imceditor) return;
      const selection = this.savedSelection;
      if (!selection) return;
      if (!this.assetLinkRootWorkspace) return;

      const text = this.quill.getText(selection.index, selection.length);
      const modal = this.$getAppManager()
        .get(DialogManager)
        .show(
          SelectAssetDialog,
          {
            searchValue: getQueryAssetPropsSelection(text ? text.trim() : ''),
            where: {
              workspaceids: this.assetLinkRootWorkspace.id,
            },
          },
          this,
        );
      imceditor.addModalPromise(modal);
      this.dropdownShown = false;
      const res = await modal;
      if (res) {
        this.quill.focus();
        this.quill.setSelection(selection);
        this.quill.format('link', false);
        this.quill.format('asset', {
          value: {
            AssetId: res.id,
            Title: res.title,
            Name: res.name,
          },
          icon: res.icon,
        });
        this.$emit('used');
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use './ImcEditorToolbar.scss';

.ImcEditorToolbarFormatLinkButton-dropdown {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown;

  &:deep(.is-button-toolbar) {
    @include ImcEditorToolbar.ImcEditorToolbar-button;
  }
}
.ImcEditorToolbarFormatLinkButton-dropdown-item {
  @include ImcEditorToolbar.ImcEditorToolbar-dropdown-item;
}

.ImcEditorToolbarFormatLinkButton-dropdown {
  display: flex;
  padding: 4px;
}

.ImcEditorToolbarFormatLinkButton-section {
  border-right: 1px solid var(--local-border-color);
  padding: 0 5px;
  display: flex;
  align-items: center;

  &:last-child {
    border-right: none;
  }
}

.ImcEditorToolbarFormatLinkButton-linkInput {
  margin-right: 5px;
  border: none;
  --input-padding: 2px var(--input-padding-horizontal);
  max-width: 50dvw;
}
.ImcEditorToolbarFormatLinkButton-assetLink {
  text-decoration: none;
}
</style>
