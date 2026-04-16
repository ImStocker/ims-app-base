<template>
  <div class="FormImsToggleWithSettings">
    <ims-toggle
      :model-value="modelValue === null ? undefined : modelValue"
      @update:model-value="ownModelValue = $event"
    ></ims-toggle>
    <div v-if="projectRight[option] === null" class="use-buttons-options">
      <button
        v-pro-function="
          projectRight?.roleNum !== 0 ? 'roleSettings' : undefined
        "
        class="is-button"
        disabled
        :title="
          projectRight.type === 'workspace'
            ? $t('setUpNotificationDialog.notificationsInheritedParent')
            : $t('setUpNotificationDialog.notificationsDefault')
        "
      >
        <i class="ri-node-tree"></i>
      </button>
    </div>
    <div v-else class="use-buttons-options">
      <button class="is-button" @click="deleteChange">
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
    option: {
      type: String,
      required: true,
    },
    roleNum: {
      type: Number,
      required: true,
    },
    modelValue: {
      type: [Boolean, null],
      default: () => null,
    },
    projectRight: {
      type: Object,
      required: true,
    },
  },
  emits: ['update:model-value', 'update:delete-change'],
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
    deleteChange() {
      this.$emit('update:delete-change');
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
