<template>
  <div class="ImcEditorAugmentation"><slot></slot></div>
</template>

<script lang="ts">
import { defineComponent, markRaw, type PropType } from 'vue';

import { IMC_FILE_BLOT_CLASS } from './blots/ImcFileBlot';
import ImcTextFile from './ImcTextFile.vue';
import {
  getProjectLinkHref,
  type ProjectInfoForLink,
} from '../../logic/router/routes-helpers';
import ImcTextUploadJob from './ImcTextUploadJob.vue';
import { InnerComponentRenderer } from './InnerComponentRenderer';
import { IMC_UPLOAD_JOB_BLOT_CLASS } from './blots/ImcUploadJobBlot';
import ImcTextAssetLink from './ImcTextAssetLink.vue';
import { IMC_ASSET_BLOT_CLASS } from './blots/ImcAssetBlot';
import ProjectManager from '../../logic/managers/ProjectManager';
import CreatorAssetManager from '../../logic/managers/CreatorAssetManager';
import { setNodeAssetIcon } from './utils';
import { IMC_FORMULA_BLOT_CLASS } from './blots/ImcFormulaBlot';
import ImcTextFormula from './ImcTextFormula.vue';

export default defineComponent({
  name: 'ImcTextAugmentation',
  props: {
    isEditor: {
      type: Boolean,
      default: false,
    },
    clickToOpen: {
      type: Boolean,
      default: true,
    },
    projectInfo: {
      type: Object as PropType<ProjectInfoForLink | null>,
      default: null,
    },
  },
  data() {
    return {
      filesRenderer: markRaw(
        new InnerComponentRenderer(
          `.${IMC_FILE_BLOT_CLASS}`,
          ImcTextFile,
          (e) => {
            const size = parseInt(e.dataset.size ?? '0');
            const height = parseInt(e.dataset.height ?? '0');
            const width = parseInt(e.dataset.width ?? '0');

            return {
              isEditor: this.isEditor,
              file: {
                value: {
                  FileId: e.dataset.fileId ?? '',
                  Dir: e.dataset.dir ? e.dataset.dir : null,
                  Store: e.dataset.store ?? '',
                  Size: !isNaN(size) ? size : 0,
                  Title: e.dataset.title ?? '',
                },
                inline: e.dataset.inline === '1',
                width: !isNaN(width) ? width : null,
                height: !isNaN(height) ? height : null,
                href: (e as HTMLAnchorElement).href
                  ? (e as HTMLAnchorElement).href
                  : null,
              },
            };
          },
        ),
      ),
      uploadJobsRenderer: markRaw(
        new InnerComponentRenderer(
          `.${IMC_UPLOAD_JOB_BLOT_CLASS}`,
          ImcTextUploadJob,
          (e) => {
            const upload_id = e.dataset.uploadId ?? '';
            return {
              isEditor: this.isEditor,
              uploadJob: {
                uploadId: upload_id,
                inline: e.dataset.inline === '1',
              },
            };
          },
        ),
      ),
      assetLinksRenderer: markRaw(
        new InnerComponentRenderer(
          `.${IMC_ASSET_BLOT_CLASS}`,
          ImcTextAssetLink,
          (e) => {
            const assetId = e.dataset.assetId ?? '';
            const blockId = e.dataset.assetBlockId ?? '';
            const anchor = e.dataset.assetAnchor ?? '';
            const assetTitle = e.dataset.assetTitle;
            const assetName = e.dataset.assetName;
            const assetIcon = e.dataset.assetIcon;

            const e_content = e.innerText;
            const title_changed = e_content !== assetTitle;

            return {
              project: this.displayingProjectInfo,
              asset: {
                id: assetId,
                title: assetTitle,
                name: assetName,
                icon: assetIcon,
                blockId,
                anchor,
              },
              openPopup: true,
              text: title_changed ? e_content : null,
            };
          },
          true,
        ),
      ),
      formulaRenderer: markRaw(
        new InnerComponentRenderer(
          `.${IMC_FORMULA_BLOT_CLASS}`,
          ImcTextFormula,
          (e) => {
            const value = e.dataset.value ?? '';
            return {
              isEditor: this.isEditor,
              value,
            };
          },
        ),
      ),
    };
  },
  computed: {
    hasGddAccess() {
      const role = this.$getAppManager()
        .get(ProjectManager)
        .getUserRoleInProject();
      if (role) return true;
      const project = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project) return false;
      return project.isPublicGdd;
    },
    displayingProjectInfo() {
      if (this.projectInfo) return this.projectInfo;
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  mounted() {
    this.update();
  },
  unmounted() {
    this.filesRenderer.destroy();
    this.uploadJobsRenderer.destroy();
    this.assetLinksRenderer.destroy();
  },
  methods: {
    update() {
      if (!this.$el) return;

      this.filesRenderer.render(this.$.appContext, this.$el);
      this.uploadJobsRenderer.render(this.$.appContext, this.$el);
      this.formulaRenderer.render(this.$.appContext, this.$el);
      if (!this.isEditor) {
        this.assetLinksRenderer.render(this.$.appContext, this.$el);
      } else {
        this._updateAssetLinksInEditor();
      }
    },
    _updateAssetLinksInEditor() {
      if (!this.$el) return;
      const links = (
        this.$el as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>(`.${IMC_ASSET_BLOT_CLASS}`);
      for (const link of links) {
        const assetId = link.dataset.assetId;
        if (!assetId) continue;

        const asset = this.$getAppManager()
          .get(CreatorAssetManager)
          .getAssetShortViaCacheSync(assetId);
        let assetIcon = link.dataset.assetIcon ?? null;
        let assetTitle = link.dataset.assetTitle;
        if (asset) {
          assetIcon = asset.icon;
          assetTitle = asset.title ?? undefined;
        }

        if (this.hasGddAccess && asset === null) {
          setNodeAssetIcon(link, null);
          link.classList.add('state-error');
          link.title = this.$t('common.notFound') + ': ' + (assetTitle ?? '');
        } else {
          setNodeAssetIcon(link, assetIcon);
          link.classList.remove('state-error');
          link.title = assetTitle ?? '';
          link.href = getProjectLinkHref(
            this.$router,
            this.displayingProjectInfo,
            {
              name: 'project-asset-by-id',
              params: {
                assetId: assetId,
              },
            },
          );
        }
      }
    },
  },
});
</script>
