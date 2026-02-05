<template>
  <div class="ProjectUserPropEditor">
    <div v-if="loading" class="ProjectUserPropEditor-loading">
      <span class="loaderSpinner"></span>
      {{ $t('common.loading') }}
    </div>
    <div v-else-if="loadingError" class="ProjectUserPropEditor-loadingError">
      {{ loadingError }}
    </div>
    <div v-else>
      <ims-select
        ref="input"
        v-model="selectedValue"
        class="ProjectUserPropEditor-select"
        :options="options"
        :clearable="nullable"
        :get-option-label="(o: ProjectUserPropEditorOption) => o.Name"
        :get-option-key="(o: ProjectUserPropEditorOption) => o.AccountId"
        :placeholder="placeholder"
      >
        <template #selected-option="{ option }">
          {{ (option as AssetPropValueAccount).Name }}
        </template>
        <template #no-options>
          {{ $t('common.controls.noMatchingOptions') }}
        </template>
      </ims-select>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import ProjectManager from '../../logic/managers/ProjectManager';
import type { Member } from '../../logic/types/ProjectTypes';
import type {
  AssetPropValue,
  AssetPropValueAccount,
} from '../../logic/types/Props';
import ImsSelect from '../Common/ImsSelect.vue';

type ProjectUserPropEditorOption = AssetPropValueAccount;

export default defineComponent({
  name: 'ProjectUserPropEditor',
  components: {
    ImsSelect,
  },
  props: {
    modelValue: {
      type: [Object, String, Number, Boolean] as PropType<AssetPropValue>,
      default: null,
    },
    onlyAdmins: { type: Boolean, default: false },
    nullable: { type: Boolean, default: true },
    roleNums: { type: Object as PropType<number[]>, default: null },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'blur', 'preEnter', 'enter'],
  data() {
    return {
      loading: false,
      loadingError: null as string | null,
      members: [] as Member[],
    };
  },
  computed: {
    selectedValue: {
      get(): ProjectUserPropEditorOption | null {
        if (
          this.modelValue &&
          (this.modelValue as AssetPropValueAccount).AccountId
        ) {
          return this.modelValue as AssetPropValueAccount;
        }
        if (typeof this.modelValue === 'number') {
          return (
            this.options.find(
              (member) => member.AccountId === this.modelValue?.toString(),
            ) ?? null
          );
        }
        return null;
      },
      set(val: ProjectUserPropEditorOption | null) {
        this.$emit('update:modelValue', val ?? null);
      },
    },
    options(): ProjectUserPropEditorOption[] {
      return this.members.map((m) => {
        return {
          AccountId: m.id.toString(),
          Name: m.name,
        };
      });
    },
  },
  watch: {},
  mounted() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = false;
      this.loadingError = null;
      this.members = [];

      try {
        this.loading = true;
        const members = await this.$getAppManager()
          .get(ProjectManager)
          .getMembersList();
        let list = members.list;
        if (this.roleNums) {
          list = list.filter(
            (m) =>
              this.roleNums.includes(m.role.num) || this.modelValue === m.id,
          );
        }
        if (this.onlyAdmins) {
          list = list.filter((m) => m.role.isAdmin || this.modelValue === m.id);
        }
        this.members = list;
        this.loading = false;
      } catch (err: any) {
        this.loadingError = err.message;
        this.loading = false;
      }
    },
    focus() {
      const input = this.$refs.input as InstanceType<typeof ImsSelect>;
      if (!input) return;
      input.focus();
    },
  },
});
</script>

<style lang="scss" scoped>
.ProjectUserPropEditor-loading {
  display: flex;
  align-items: center;
  .loaderSpinner {
    margin: 5px;
    font-size: 6px;
  }
}

.ProjectUserPropEditor-loadingError {
  padding: 5px;
  color: var(--color-main-error);
}

.ProjectUserPropEditor-select {
  border: none;
  background: none;
  width: 100%;
  display: block;
}
</style>
