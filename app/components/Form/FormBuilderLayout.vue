<template>
  <div class="FormBuilderLayout FormBuilder-layout">
    <div
      v-for="(group, group_ind) of groupedFields"
      :key="group_ind"
      class="FormBuilder-group"
    >
      <div v-if="group.caption" class="FormBuilder-group-caption">
        <slot name="groupCaption" :caption="group.caption">
          {{ group.caption }}
        </slot>
      </div>
      <div v-if="group.main.length > 0" class="FormBuilder-group-main">
        <slot
          name="mainFields"
          :fields="group.main"
          :form-model="formModel"
          :form-composer="formComposer"
        >
          <slot
            name="fields"
            :fields="group.main"
            :form-model="formModel"
            :form-composer="formComposer"
          >
            <form-builder-field-list
              :fields="group.main"
              :form-model="formModel"
              :form-composer="formComposer"
            ></form-builder-field-list>
          </slot>
        </slot>
      </div>
      <advanced-props-spoiler
        v-if="group.advanced.length > 0"
        class="FormBuilder-group-advanced"
      >
        <slot
          name="advancedFields"
          :fields="group.advanced"
          :form-model="formModel"
          :form-composer="formComposer"
        >
          <slot
            name="fields"
            :fields="group.advanced"
            :form-model="formModel"
            :form-composer="formComposer"
          >
            <form-builder-field-list
              :fields="group.advanced"
              :form-model="formModel"
              :form-composer="formComposer"
            ></form-builder-field-list>
          </slot>
        </slot>
      </advanced-props-spoiler>
    </div>
  </div>
</template>

<script lang="ts">
import type FormBuilderModelBase from './FormBuilderModelBase';
import FormBuilderComposerBase from './FormBuilderComposerBase';
import FormBuilderFieldList from './FormBuilderFieldList.vue';
import AdvancedPropsSpoiler from './AdvancedPropsSpoiler.vue';
import { defineComponent, type PropType } from 'vue';
import type { FormComposedGroup } from './FormBuilderTypes';

export default defineComponent({
  name: 'FormBuilderLayout',
  components: {
    AdvancedPropsSpoiler,
    FormBuilderFieldList,
  },
  props: {
    groupedFields: { type: Array<FormComposedGroup>, required: true },
    formModel: {
      required: true,
      type: Object as PropType<FormBuilderModelBase>,
    },
    formComposer: { required: true, type: FormBuilderComposerBase },
  },
  computed: {},
  methods: {},
});
</script>

<style lang="scss" scoped>
.FormBuilder-group-advanced {
  margin-top: 10px;
}
.FormBuilder-group:not(:last-child) {
  margin-bottom: 10px;
}
</style>
