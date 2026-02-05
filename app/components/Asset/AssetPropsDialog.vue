<template>
  <dialog-content class="AssetPropsDialog" @escape-press="choose()">
    <div class="AssetPropsDialog-Content">
      <asset-block-editor-root
        ref="editorRoot"
        class="AssetPropsDialog-editor"
        :asset-full="assetFull"
      >
        <template #default="{ assetBlockEditor }">
          <asset-block-editor
            class="AssetFullEditor-blockEditor"
            :allow-add-blocks="false"
            :allow-delete-blocks="false"
            :allow-drag-blocks="false"
            :show-names="false"
            display-mode="page"
            :asset-block-editor="assetBlockEditor"
            :hide-root-links="true"
            :filter-blocks="
              (block) => block.name === propName && block.type === propName
            "
            @update:is-dirty="isDirty = $event"
          />
        </template>
      </asset-block-editor-root>
    </div>
    <div class="Form-row-buttons">
      <div
        v-if="!isDirty"
        class="Form-row-buttons-center AssetPropsDialog-footer use-buttons-action"
      >
        <button class="is-button is-button-normal" @click="choose()">
          {{ $t('common.dialogs.close') }}
        </button>
      </div>
      <div
        v-else
        class="Form-row-buttons-center AssetPreviewDialog-footer use-buttons-action"
      >
        <button
          class="is-button is-button-normal"
          :disabled="blockSaving"
          @click="saveChanges()"
        >
          {{ $t('common.dialogs.save') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '../Dialog/DialogContent.vue';
import type { DialogInterface } from '../../logic/managers/DialogManager';
import AssetBlockEditorRoot from './Editor/AssetBlockEditorRoot.vue';
import AssetBlockEditor from './Editor/AssetBlockEditor.vue';
import type { AssetFullInstanceR } from '../../logic/types/AssetFullInstance';

type DialogProps = {
  assetFull: AssetFullInstanceR;
  propName: string;
};

type DialogResult = void;

export default defineComponent({
  name: 'AssetPropsDialog',
  components: {
    DialogContent,
    AssetBlockEditorRoot,
    AssetBlockEditor,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  emits: ['dialog-parameters'],
  data() {
    return {
      isDirty: false,
      blockSaving: false,
    };
  },
  computed: {
    propName() {
      return this.dialog.state.propName;
    },
    assetFull() {
      return this.dialog.state.assetFull;
    },
  },
  watch: {
    isDirty() {
      this.$emit('dialog-parameters', {
        forbidClose: this.isDirty,
      });
    },
  },
  methods: {
    choose() {
      this.dialog.close();
    },
    async saveChanges() {
      if (!this.$refs['editorRoot']) return;
      this.blockSaving = true;
      try {
        await (
          this.$refs['editorRoot'] as InstanceType<typeof AssetBlockEditorRoot>
        ).saveChanges();
      } finally {
        this.blockSaving = false;
      }
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/asset-icons';
@use '$style/devices-mixins';

.AssetPropsDialog {
  width: 1000px;
  max-width: 1000px;
  padding: 0px 0px 20px 0px;
}
.AssetPropsDialog-loading-wrapper {
  display: flex;
  flex: 1;
  padding: 10px;
}
.AssetPropsDialog-Content {
  padding: 20px 15px;
  align-items: center;
}
</style>
