<template>
  <div class="FormImsToggleWithSettings">
    <ims-toggle
      :model-value="modelValue"
      @update:model-value="ownModelValue = $event"
    ></ims-toggle>
    <div v-if="projectRight.ownRights === null" class="use-buttons-options">
      <button
        v-pro-function="projectRight.roleNum !== 0 ? 'roleSettings' : undefined"
        class="is-button"
        disabled
        :title="
          projectRight.type === 'workspace'
            ? $t('setUpAccessDialog.rightsInheritedParent')
            : $t('setUpAccessDialog.rightsDefault')
        "
      >
        <i class="ri-node-tree"></i>
      </button>
    </div>
    <div v-else class="use-buttons-options">
      <button class="is-button" @click="deleteChange(projectRight.roleNum)">
        <i class="ri-close-fill"></i>
      </button>
    </div>
  </div>
</template>

<script type="text/ecmascript-6" lang="ts">
import ImsToggle from '#components/Common/ImsToggle.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  title: 'FormImsToggleWithSettings',
  components: {
    ImsToggle,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    projectRight: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:model-value'],
  computed: {
    ownModelValue: {
      get() {
        return this.modelValue;
      },
      set(val: boolean) {
        this.$emit('update:model-value', val);
      },
    },
  },
  methods: {
    deleteChange(role_num: number) {
      /*const ind = this.changes.findIndex((ch) => ch.roleNum === role_num);
      if (ind > -1) {
        this.changes.splice(ind, 1);
      } else {
        this.changes.push({
          roleNum: role_num,
          rights: null,
        });
      }*/
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormImsToggleWithSettings {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
