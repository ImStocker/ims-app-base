<template>
  <div class="SelectWorkspaceListBox">
    <FormSearch
      class="SelectWorkspaceListBox-search"
      :value="searchTextOwn"
      :autofocus="true"
      @change="searchTextOwn = $event"
    ></FormSearch>
    <div class="SelectWorkspaceListBox-allOptions">
      <div class="SelectWorkspaceListBox-items tiny-scrollbars">
        <project-workspaces-presenter
          :workspace-where="workspaceWhereComp"
          :is-drag-allowed="false"
          :selection="curSelection"
          @update:selection="changeValue($event[0])"
        ></project-workspaces-presenter>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ProjectWorkspacesPresenter from './ProjectTree/ProjectWorkspacesPresenter.vue';
import FormSearch from '../Form/FormSearch.vue';
import type { WorkspaceForSelection } from '../../logic/types/AssetsType';
import type { WorkspaceQueryDTOWhere } from '../../logic/types/Workspaces';
import type { ProjectTreeSelectedItem } from '../../logic/vm/IProjectTreePresenterVM';

export default defineComponent({
  name: 'SelectWorkspaceListBox',
  components: {
    ProjectWorkspacesPresenter,
    FormSearch,
  },
  props: {
    modelValue: {
      type: Object as PropType<WorkspaceForSelection | null>,
      required: false,
      default: null,
    },
    searchText: {
      type: String,
      default: '',
    },
    where: {
      type: [Object, null] as PropType<WorkspaceQueryDTOWhere | null>,
      default: null,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'update:searchText'],
  data() {
    return {
      searchTextOwn: this.searchText,
    };
  },
  computed: {
    curSelection(): ProjectTreeSelectedItem[] {
      if (this.modelValue) {
        return [{ id: this.modelValue.id, type: 'workspace' }];
      }
      return [];
    },
    workspaceWhereComp(): WorkspaceQueryDTOWhere {
      const res = {
        ...(this.where ? this.where : {}),
      };
      const trim_search = this.searchTextOwn ? this.searchTextOwn.trim() : '';
      if (trim_search) res.query = trim_search;
      return res;
    },
  },
  watch: {
    searchText() {
      if (this.searchTextOwn !== this.searchText) {
        this.searchTextOwn = this.searchText;
      }
    },
    searchTextOwn() {
      if (this.searchTextOwn !== this.searchText) {
        this.$emit('update:searchText', this.searchTextOwn);
      }
    },
  },
  methods: {
    changeValue(ev: WorkspaceForSelection | null) {
      this.$emit('update:modelValue', ev);
    },
  },
});
</script>

<style lang="scss">
@use '$style/asset-icons';
@use '$style/devices-mixins.scss';

.SelectWorkspaceListBox {
  --SelectWorkspaceListBox-itemsHeight: 125px;
}

.SelectWorkspaceListBox-search {
  margin-bottom: 12px;
}

.SelectWorkspaceListBox-asset-icon {
  margin-right: 5px;
  @include asset-icons.asset-icons;
}

.SelectWorkspaceListBox-items {
  display: flex;
  gap: 8px;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}
.SelectWorkspaceListBox-allOptions {
  display: flex;
  flex-direction: column;
  height: var(--SelectWorkspaceListBox-itemsHeight);
}
</style>
