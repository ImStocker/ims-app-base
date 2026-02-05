<template>
  <ims-select
    v-if="!load"
    v-model="editingValue"
    :options="options"
    :get-option-label="
      (opt: any) => {
        const val_from_opt = getValFromOption(opt[optionValue]);
        return val_from_opt
          ? convertTranslatedTitle(val_from_opt['title'], (key) => $t(key))
          : $t('boardPage.tasks.moveToBoard');
      }
    "
    :reduce="(opt: any) => opt[optionValue]"
    :title="label.length > 0 ? label : undefined"
    :append-to-body="true"
  ></ims-select>
  <div v-else class="loaderSpinner"></div>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent } from 'vue';
import TaskManager from '../../logic/managers/TaskManager';
import type { Workspace } from '../../logic/types/Workspaces';
import ImsSelect from '../Common/ImsSelect.vue';
import { convertTranslatedTitle } from '../../logic/utils/assets';

export default defineComponent({
  title: 'FormSelectBoard',
  components: {
    ImsSelect,
  },
  props: {
    value: {
      type: String,
      default: () => '',
    },
    optionLabel: {
      type: String,
      default: () => 'title',
    },
    optionValue: {
      type: String,
      default: () => 'id',
    },
    lightBorders: {
      type: Boolean,
      default: () => false,
    },
    clearable: {
      type: Boolean,
      default: () => false,
    },
    label: {
      type: String,
      default: () => '',
    },
  },
  emits: ['input'],
  data() {
    return {
      editingValue: this.value,
      options: [] as Workspace[],
      load: true,
    };
  },
  computed: {
    hasOptions() {
      return this.options.length > 0;
    },
  },
  watch: {
    editingValue() {
      this.$emit('input', this.editingValue);
    },
  },
  async mounted() {
    this.load = true;
    this.options = await this.$getAppManager().get(TaskManager).getBoards();
    this.load = false;
  },
  methods: {
    convertTranslatedTitle,
    getValFromOption(opt_id: string) {
      return this.options.find((opt) => opt.id === opt_id);
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';
.FormSelectUser-shortText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
