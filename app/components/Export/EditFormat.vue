<template>
  <div class="EditFormat">
    <div class="EditFormat-form tiny-scrollbars">
      <form-builder
        :form-schema="formSchema"
        :form-model="formModel"
      ></form-builder>
    </div>
    <div v-if="isDirty" class="EditFormat-options">
      <button class="is-button is-button-action" @click="cancel">
        {{ $t('common.dialogs.cancel') }}
      </button>
      <button
        class="is-button is-button-action accent"
        :disabled="isSaveDisabled"
        :class="{ loading: isSaving }"
        @click="save"
      >
        {{ $t('common.dialogs.save') }}
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, inject, type PropType } from 'vue';
import FormBuilder from '../Form/FormBuilder.vue';
import type { FormSchema } from '../Form/FormBuilderTypes';
import FormBuilderModelBindObject from '../Form/FormBuilderModelBindObject';
import type { AssetQueryWhere, AssetShort } from '../../logic/types/AssetsType';
import {
  castAssetPropValueToString,
  type AssetPropValue,
  type AssetPropValueAsset,
} from '../../logic/types/Props';
import ImsInput from '../Common/ImsInput.vue';
import AssetSelectorPropEditor from '../Props/AssetSelectorPropEditor.vue';
import ImsSelect from '../Common/ImsSelect.vue';
import EditFormatTemplate from './EditFormatTemplate.vue';
import FormCheckBox from '../Form/FormCheckBox.vue';
import EditFormatPostProcessing from './EditFormatPostProcessing.vue';
import { getPreparedAssets } from '../../logic/local-fs-sync/getPreparedAsset';
import { AssetPropWhereOpKind } from '../../logic/types/PropsWhere';
import type { UiNavigationGuardHandler } from '../../logic/managers/UiManager';
import UiManager from '../../logic/managers/UiManager';
import {
  ASSET_SELECTION_DIAGRAM,
  ASSET_SELECTION_ENUM,
  ASSET_SELECTION_GAME_MECHANICS,
  ASSET_SELECTION_GAME_OBJECT,
  ASSET_SELECTION_LEVEL,
  ASSET_SELECTION_MARKDOWN,
  ASSET_SELECTION_SCRIPT,
  ASSET_SELECTION_STRUCTURE,
} from '../../logic/constants';
import { assert } from '#logic/utils/typeUtils';
import ImportExportSubContext, {
  type ExportFormat,
  type ExportFormatField,
} from '#logic/project-sub-contexts/ImportExportSubContext';
import { AssetSubContext } from '#logic/project-sub-contexts/AssetSubContext';
import LocalFsSyncSubContext from '#logic/project-sub-contexts/LocalFsSyncSubContext';
import { injectedProjectContext } from '#logic/types/IProjectContext';

export default defineComponent({
  name: 'EditFormat',
  components: {
    FormBuilder,
  },
  props: {
    format: {
      type: Object as PropType<ExportFormat>,
      required: true,
    },
    isSaving: {
      type: Boolean,
      default: false,
    },
    isNew: {
      type: Boolean,
      default: false,
    },
    baseAsset: {
      type: Object as PropType<AssetShort | null>,
      default: null,
    },
  },
  emits: ['change', 'cancel', 'dirty'],
  setup() {
    const projectContext = inject(injectedProjectContext);
    assert(projectContext, 'Project context not provided');
    return {
      projectContext,
    };
  },
  data() {
    return {
      formatState: this.getClearedFormatState(),
      isLoading: false,
      loadError: null as string | null,
      navigationGuardHandler: null as null | UiNavigationGuardHandler,
    };
  },
  computed: {
    segments() {
      return this.projectContext.get(LocalFsSyncSubContext).getSegmentList();
    },
    formats() {
      return this.projectContext.get(ImportExportSubContext).getExportFormats();
    },
    isSaveDisabled() {
      return (
        this.isSaving ||
        !this.formatSegmentType ||
        ((this.formatKind === 'selectFields' ||
          this.formatSegmentType === 'csv') &&
          !this.formatFields.length)
      );
    },
    isDirty() {
      return this.hasChanges || this.isNew;
    },
    hasChanges() {
      return JSON.stringify(this.format) !== JSON.stringify(this.formatState);
    },
    gddWorkspaceId() {
      return this.projectContext
        .get(AssetSubContext)
        .getWorkspaceByNameViaCacheSync('gdd')?.id;
    },
    includingAssetsTypeWhere() {
      return {
        workspaceids: this.gddWorkspaceId,
        ...(this.baseAsset
          ? {
              availtypes: {
                op: AssetPropWhereOpKind.OR,
                v: [
                  {
                    typeids: [this.baseAsset.id],
                  },
                  {
                    id: this.baseAsset.id,
                  },
                ],
              },
            }
          : {}),
      };
    },
    formatTemplate: {
      get(): Pick<ExportFormat, 'kind' | 'fields'> {
        return {
          kind: this.formatKind,
          fields: this.formatFields,
        };
      },
      set(val: Pick<ExportFormat, 'kind' | 'fields'>) {
        this.formatKind = val.kind;
        this.formatFields = val.fields;
      },
    },
    formatJscode: {
      get() {
        return this.formatState.jscode;
      },
      set(val: string) {
        this.formatState.jscode = val;
      },
    },
    csvDelimiterOptions() {
      const vals = [',', ';'];
      return vals.map((val) => {
        return {
          name: val,
          title: this.$t(
            'importExport.formats.segments.csv.settings.delimiterTypes.' + val,
          ),
        };
      });
    },
    formatTitle: {
      get(): string {
        return this.formatState.title;
      },
      set(val: string) {
        this.formatState.title = val;
      },
    },
    formatAssetType: {
      get(): AssetPropValueAsset | null {
        return this.formatState.assetType;
      },
      set(val: AssetPropValueAsset | null) {
        this.formatState.assetType = val;
      },
    },
    formatSegmentType: {
      get(): ExportFormat['segmentType'] {
        return this.formatState.segmentType;
      },
      set(val: ExportFormat['segmentType']) {
        this.formatState.segmentType = val;
        if (val === 'csv') {
          this.formatState.kind = 'selectFields';
        } else if (val === 'json') {
          this.formatState.kind = 'full';
        }
      },
    },
    formatKind: {
      get(): ExportFormat['kind'] {
        return this.formatState.kind;
      },
      set(val: ExportFormat['kind']) {
        this.formatState.kind = val;
      },
    },
    formatFields: {
      get(): ExportFormat['fields'] {
        return this.formatState.fields;
      },
      set(val: ExportFormat['fields']) {
        this.formatState.fields = val;
      },
    },
    formatParamsCsvDelimiter: {
      get(): string {
        return castAssetPropValueToString(
          (this.formatState.params?.delimiter ?? ',') as AssetPropValue,
        );
      },
      set(val: string) {
        if (!this.formatState.params) {
          this.formatState.params = {};
        }
        this.formatState.params.delimiter = val;
      },
    },
    formatParamsCsvShowTitles: {
      get(): boolean {
        if (this.formatState.params?.showTitles === undefined) return true;
        return !!this.formatState.params.showTitles;
      },
      set(val: boolean) {
        if (!this.formatState.params) {
          this.formatState.params = {};
        }
        this.formatState.params.showTitles = val;
      },
    },
    formatParamsJsonOneFile: {
      get(): boolean {
        return !!this.formatState.params?.oneFile;
      },
      set(val: boolean) {
        if (!this.formatState.params) {
          this.formatState.params = {};
        }
        this.formatState.params.oneFile = val;
      },
    },
    availableTypes(): { title: string; name: string }[] {
      if (!this.segments) return [];
      return this.segments.map((s) => {
        return {
          name: s.name,
          title: this.$t('importExport.formats.segments.' + s.name + '.title'),
        };
      });
    },
    baseAssetOptions() {
      const base_assets = [
        this.$appConfiguration.isDesktop ? ASSET_SELECTION_MARKDOWN : null,
        ASSET_SELECTION_GAME_OBJECT,
        ASSET_SELECTION_GAME_MECHANICS,
        ASSET_SELECTION_DIAGRAM,
        ASSET_SELECTION_SCRIPT,
        ASSET_SELECTION_LEVEL,
      ]
        .filter((x) => x)
        .map((x) => {
          return {
            ...x!,
            tooltip: this.$t('asset.createTooltips.' + x!.id),
          };
        });
      return [...base_assets, ASSET_SELECTION_STRUCTURE, ASSET_SELECTION_ENUM];
    },
    formSchema(): FormSchema {
      return [
        {
          caption: this.$t('importExport.formats.settings.enterName'),
          prop: 'formatTitle',
          editor: ImsInput,
        },
        {
          caption: this.$t('importExport.formats.settings.assetsType'),
          editor: AssetSelectorPropEditor,
          prop: 'formatAssetType',
          editorProps: {
            additionalOptions: this.baseAssetOptions,
            where: this.includingAssetsTypeWhere,
            placeholder: this.$t('importExport.formats.settings.assetsAll'),
          },
        },
        {
          caption: this.$t('importExport.formats.settings.selectType'),
          prop: 'formatSegmentType',
          editor: ImsSelect,
          editorProps: {
            options: this.availableTypes,
            getOptionLabel: (opt: any) => opt.title,
            getOptionKey: (opt: any) => opt.name,
            reduce: (opt: any) => opt.name,
          },
        },
        this.formatSegmentType
          ? {
              caption: this.$t('importExport.formats.settings.selectTemplate'),
              prop: 'formatTemplate',
              editorProps: {
                segmentType: this.formatSegmentType,
                assetId: this.formatAssetType?.AssetId ?? null,
                getSampleAsset: (kind, fields) =>
                  this.getSampleAssetByTemplate(kind, fields),
              },
              editor: EditFormatTemplate,
            }
          : null,
        ...(this.formatSegmentType === 'csv'
          ? [
              {
                caption: this.$t(
                  'importExport.formats.segments.csv.settings.selectDelimiter',
                ),
                editor: ImsSelect,
                prop: 'formatParamsCsvDelimiter',
                editorProps: {
                  options: this.csvDelimiterOptions,
                  getOptionLabel: (
                    opt: (typeof this.csvDelimiterOptions)[number],
                  ) => opt.title,
                  getOptionKey: (
                    opt: (typeof this.csvDelimiterOptions)[number],
                  ) => opt.name,
                  reduce: (opt: (typeof this.csvDelimiterOptions)[number]) =>
                    opt.name,
                },
              },
              {
                caption: this.$t(
                  'importExport.formats.segments.csv.settings.showTitles',
                ),
                editor: FormCheckBox,
                prop: 'formatParamsCsvShowTitles',
                editorProps: {
                  value: this.formatParamsCsvShowTitles,
                },
              },
            ]
          : []),
        this.formatSegmentType === 'json'
          ? {
              caption: this.$t(
                'importExport.formats.segments.json.settings.groupInOneFile',
              ),
              editor: FormCheckBox,
              prop: 'formatParamsJsonOneFile',
              editorProps: {
                value: this.formatParamsJsonOneFile,
              },
            }
          : null,
        {
          caption: this.$t('importExport.formats.settings.postProcessing'),
          prop: 'formatJscode',
          editor: EditFormatPostProcessing,
          editorProps: {
            getSampleAsset: () => this.getSampleAsset(),
          },
          advanced: true,
        },
      ].filter((x) => x) as FormSchema;
    },
    formModel() {
      return new FormBuilderModelBindObject(this);
    },
  },
  watch: {
    format() {
      this.formatState = this.getClearedFormatState();
    },
    isDirty() {
      this.$emit('dirty', this.isDirty);
    },
  },
  async mounted() {
    await this.load();

    this.navigationGuardHandler = this.projectContext.appManager
      .get(UiManager)
      .setNavigationGuard(
        () => !this.isDirty,
        () => false,
      );
  },
  unmounted() {
    this.navigationGuardHandler?.cancel();
  },
  methods: {
    getClearedFormatState() {
      return {
        ...this.format,
        assetType: this.format.assetType ? { ...this.format.assetType } : null,
        params: this.format.params ? { ...this.format.params } : {},
      };
    },
    async load() {
      try {
        this.isLoading = true;
        this.loadError = null;
      } catch (err: any) {
        this.loadError = err.message;
      } finally {
        this.isLoading = false;
      }
    },
    async getSampleAssetByTemplate(
      kind: ExportFormat['kind'],
      fields: ExportFormatField[],
    ) {
      const initialWhere: AssetQueryWhere = this.formatAssetType?.AssetId
        ? { typeids: [this.formatAssetType.AssetId] }
        : {
            ...this.includingAssetsTypeWhere,
          };
      const [base_asset] = await getPreparedAssets(
        this.projectContext,
        {
          where: initialWhere,
          count: 1,
        },
        {
          kind,
          fields,
        },
      );
      if (base_asset) {
        return base_asset;
      }

      if (this.formatAssetType?.AssetId) {
        return (
          await getPreparedAssets(
            this.projectContext,
            {
              where: {
                id: [this.formatAssetType.AssetId],
              },
              count: 1,
            },
            {
              kind,
              fields,
            },
          )
        )[0];
      }
    },
    async getSampleAsset() {
      let fields;
      if (Array.isArray(this.formatState.fields)) {
        fields = this.formatState.fields;
      }

      return await this.getSampleAssetByTemplate(this.formatKind, fields);
    },
    save() {
      if (this.isNew) {
        const existing_format = this.formats.findIndex(
          (el) => el.title === this.formatState.title,
        );
        if (existing_format >= 0) {
          this.projectContext.appManager
            .get(UiManager)
            .showError(this.$t('importExport.formats.formatAlreadyExists'));
          return;
        }
      }
      this.$emit('change', { ...this.formatState });
    },
    cancel() {
      this.formatState = this.getClearedFormatState();
      if (this.isNew) {
        this.$emit('cancel');
      }
    },
  },
});
</script>
<style lang="scss" scoped>
.EditFormat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: space-between;
  height: 100%;
}
.EditFormat-form {
  overflow: auto;
  height: auto;
  padding: 0 5px 0 0;
}
.EditFormat-options {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
}
</style>
