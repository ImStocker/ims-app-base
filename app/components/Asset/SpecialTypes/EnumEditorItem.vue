<template>
  <some-editor-list-item
    class="EnumEditorItem"
    :item="item"
    :readonly="readonly"
  >
    <template #item-main>
      <div class="EnumEditorItem-main">
        <renamable-text
          v-model:is-renaming-mode-state="isMainEditMode"
          class="EnumEditorItem-main-renamable"
          :class="{ 'is-editing': isMainEditMode }"
          :disabled="readonly"
        >
          <caption-string
            v-if="item.title"
            :value="item.title"
            class="EnumEditorItem-main-title"
            :class="{ 'state-inherited': isPropInherited('title') }"
          ></caption-string>
          <template v-else>{{ item.name }}</template>
          <template #editor="{ applyRenaming }">
            <div
              ref="mainEditItem"
              class="EnumEditorItem-main-editor"
              @vue:mounted="_editMainMounted"
              @focusout="_mainEditFocusOut($event, applyRenaming)"
            >
              <ims-text-input
                ref="mainEditTitle"
                class="EnumEditorItem-main-editor-title"
                :model-value="mainEditItem.title ?? ''"
                :placeholder="item.name"
                @update:model-value="mainEditSetTitle($event)"
              ></ims-text-input>
              <div class="EnumEditorItem-main-editor-serviceName">
                <div
                  v-if="mainEditServiceNameError"
                  class="EnumEditorItem-main-editor-serviceName-error"
                  :title="mainEditServiceNameError"
                >
                  <i class="ri-error-warning-fill"></i>
                </div>
                <div
                  v-else
                  class="EnumEditorItem-main-editor-serviceName-icon"
                  :title="$t('assetEditor.enum.serviceName')"
                >
                  <i class="ri-price-tag-3-fill"></i>
                </div>
                <ims-text-input
                  ref="mainEditName"
                  v-model="mainEditItem.name"
                  :validation-error="mainEditServiceNameError"
                  class="EnumEditorItem-main-editor-serviceName-input"
                ></ims-text-input>
                <button
                  :style="{
                    visibility:
                      item.name === mainEditItem.name ? 'hidden' : undefined,
                  }"
                  class="EnumEditorItem-main-editor-serviceName-undo is-button is-button-icon"
                  :title="$t('assetEditor.enum.revertServiceNameChange')"
                  @click="mainEditItem.name = item.name"
                >
                  <i class="ri-arrow-go-back-line"></i>
                </button>
              </div>
            </div>
          </template>
        </renamable-text>
        <div
          v-if="!isMainEditMode"
          class="EnumEditorItem-main-serviceName"
          :title="$t('assetEditor.enum.serviceName')"
          :class="{ 'state-inherited': isPropInherited('name') }"
          @dblclick="editServiceName"
        >
          <i class="ri-price-tag-3-fill"></i>
          <span class="EnumEditorItem-main-serviceName-text">
            {{ item.name }}
          </span>
        </div>
      </div>
    </template>
    <template v-if="!readonly" #item-advanced>
      <button
        class="is-button is-button-action danger"
        @click="$emit('delete')"
      >
        {{ $t('assetEditor.enum.deleteElement') }}
      </button>
    </template>
  </some-editor-list-item>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { AssetChanger } from '../../../logic/types/AssetChanger';
import type { EnumItem } from './EnumEditor';
import SomeEditorListItem from './SomeEditorListItem.vue';
import RenamableText from '../../Common/RenamableText.vue';
import ImsTextInput from '../../Common/ImsTextInput.vue';
import {
  isPropInherited,
  makeBlockRef,
  normalizeAssetPropPart,
} from '../../../logic/types/Props';
import type { ResolvedAssetBlock } from '../../../logic/utils/assets';
import UiManager from '../../../logic/managers/UiManager';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'EnumEditorItem',
  components: {
    SomeEditorListItem,
    RenamableText,
    ImsTextInput,
    CaptionString,
  },
  props: {
    block: {
      type: Object as PropType<ResolvedAssetBlock>,
      required: true,
    },
    item: {
      type: Object as PropType<EnumItem>,
      required: true,
    },
    enumItems: {
      type: Array<EnumItem>,
      required: true,
    },
    assetChanger: {
      type: Object as PropType<AssetChanger>,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['delete'],
  data() {
    return {
      mainEditItem: { ...this.item },
      isMainEditMode: false,
    };
  },
  computed: {
    mainEditServiceNameError() {
      if (!this.mainEditItem.name) {
        return this.$t('assetEditor.enum.serviceNameEmpty');
      }
      const already_used = this.enumItems.some(
        (item) => item !== this.item && item.name === this.mainEditItem.name,
      );
      if (already_used) {
        return this.$t('assetEditor.enum.serviceNameAlreadyInUse');
      }
      return null;
    },
  },
  watch: {
    isMainEditMode(mode: boolean) {
      if (!mode) {
        if (this.mainEditServiceNameError) {
          this.$getAppManager()
            .get(UiManager)
            .showError(this.mainEditServiceNameError);
          return;
        }
        const op_id = this.assetChanger.makeOpId();
        if (this.mainEditItem.name !== this.item.name) {
          this.assetChanger.setBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `items\\${this.item.index}\\name`,
            this.mainEditItem.name,
            op_id,
          );
        }
        if (this.mainEditItem.title !== this.item.title) {
          this.assetChanger.setBlockPropKey(
            this.block.assetId,
            makeBlockRef(this.block),
            null,
            `items\\${this.item.index}\\title`,
            this.mainEditItem.title,
            op_id,
          );
        }
      }
    },
  },
  methods: {
    _editMainMounted() {
      const mainEditTitle = this.$refs['mainEditTitle'] as InstanceType<
        typeof ImsTextInput
      > | null;
      if (!mainEditTitle) {
        return;
      }
      this.mainEditItem = { ...this.item };
      mainEditTitle.selectAll();
    },
    _mainEditFocusOut(event: FocusEvent, applyRenaming) {
      const mainEdit = this.$refs['mainEdit'] as HTMLDivElement | null;
      if (!mainEdit) {
        return;
      }
      if (
        event.relatedTarget &&
        !mainEdit.contains(event.relatedTarget as HTMLElement)
      ) {
        applyRenaming();
      }
    },
    async editServiceName() {
      if (this.readonly) {
        return;
      }
      this.isMainEditMode = true;
      await this.$nextTick();
      const mainEditName = this.$refs['mainEditName'] as InstanceType<
        typeof ImsTextInput
      > | null;
      if (!mainEditName) {
        return;
      }
      mainEditName.selectAll();
    },
    mainEditSetTitle(val: string) {
      this.mainEditItem.title = val ? val : null;
      if (val) {
        this.mainEditItem.name = normalizeAssetPropPart(val);
      } else {
        this.mainEditItem.name = this.item.name;
      }
    },
    isPropInherited(prop: 'name' | 'title') {
      const key = `items\\${this.item.index}\\${prop}`;
      return (
        isPropInherited(key, this.block.props, this.block.inherited ?? {}) &&
        this.block.props[key] === undefined
      );
    },
  },
});
</script>
<style lang="scss" scoped>
.EnumEditorItem-main-editor {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 1.8em;
}
.EnumEditorItem-main-editor-text {
  user-select: none;
  white-space: nowrap;
}
.EnumEditorItem-main-editor-serviceName {
  display: flex;
  flex: 1 1 33%;
  gap: 4px;
  align-items: center;
  min-width: 0;
}
.EnumEditorItem-main-editor-serviceName-icon,
.EnumEditorItem-main-editor-serviceName-error,
.EnumEditorItem-main-serviceName {
  color: var(--local-sub-text-color);
}
.EnumEditorItem-main-editor-serviceName-icon,
.EnumEditorItem-main-editor-serviceName-error {
  display: flex;
  flex: none;
  align-items: center;
  line-height: 1;
}
.EnumEditorItem-main-editor-serviceName-error {
  color: var(--color-danger);
}
.EnumEditorItem-main-editor-serviceName-input {
  flex: 1 1 auto;
  min-width: 0;
}
.EnumEditorItem-main-editor-serviceName-undo {
  flex: none;
  padding: 1px 4px;
  background-color: transparent;
  color: var(--local-sub-text-color);

  &:hover {
    color: var(--local-text-color);
  }
}
.EnumEditorItem-main {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 27px;
}
.EnumEditorItem-main-renamable {
  min-width: 0;

  &:not(.is-editing) {
    flex: 1 1 66%;
  }

  &.is-editing {
    flex: 1;
  }
}

.EnumEditorItem-main-editor-title {
  flex: 1 1 66%;
  min-width: 0;
}

.EnumEditorItem-main-serviceName {
  display: flex;
  flex: 1 1 33%;
  gap: 4px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}
.EnumEditorItem-main-serviceName-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.EnumEditorItem-main-title.state-inherited,
.EnumEditorItem-main-serviceName.state-inherited {
  color: var(--color-inherited-value);
}
</style>
