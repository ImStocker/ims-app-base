<template>
  <div class="ChangesHistory">
    <div v-if="!projectHistoryVM.isLoading" class="ChangesHistory-main">
      <feed-loader
        class="PulseFeed"
        :load-more="() => projectHistoryVM.loadMoreChanges()"
        :disabled="projectHistoryVM.isLoading"
        :has-more="projectHistoryVM.hasMore"
      >
        <div v-if="history.length > 0" class="ChangesHistory-main-block">
          <history-row
            v-for="historyRow of history"
            :key="historyRow.id"
            class="AssetHistoryDialog-row"
            :history-row="historyRow"
          ></history-row>
        </div>
        <div v-else class="ChangesHistory-noChanges">
          {{ $t('history.noChanges') }}
        </div>
      </feed-loader>

      <div v-if="daysLimit" class="ChangesHistory-main-proInfo">
        {{
          $t('history.freeVersionLimit', {
            days: daysLimit,
          })
        }}
        <button class="is-button is-button-action accent" @click="upgrade()">
          {{ $t('history.upgradeToPro') }}
        </button>
      </div>
    </div>
    <div v-else-if="projectHistoryVM.loadError" class="error-message-block">
      {{ projectHistoryVM.loadError }}
    </div>
    <div v-else class="loaderSpinner PageLoaderSpinner"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import FeedLoader from '../Common/FeedLoader.vue';
import HistoryRow from './HistoryRow.vue';
import { ProjectHistoryVM } from '../../logic/vm/ProjectHistoryVM';
import ProjectManager from '../../logic/managers/ProjectManager';
import UiManager from '../../logic/managers/UiManager';
export default defineComponent({
  name: 'ChangesHistory',
  components: {
    FeedLoader,
    HistoryRow,
  },
  data() {
    return {
      projectHistoryVM: new ProjectHistoryVM(this.$getAppManager()),
    };
  },
  computed: {
    history() {
      return this.projectHistoryVM.getGlobalHistoryChanges();
    },
    daysLimit() {
      const project_info = this.$getAppManager()
        .get(ProjectManager)
        .getProjectInfo();
      if (!project_info) return false;
      return project_info.license?.features.changeHistoryDays;
    },
  },
  async mounted() {
    await this.loadPage();
  },
  methods: {
    async upgrade() {
      await this.$getAppManager().get(UiManager).showUpgradeDialog();
    },
    async loadPage() {
      await this.projectHistoryVM.load();
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.ChangesHistory-main {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.ChangesHistory-main-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ChangesHistory-noChanges {
  font-style: italic;
  color: #999;
  padding-top: 20px;
}
.ChangesHistory-main-proInfo {
  border: 1px dashed var(--color-accent);
  border-radius: 4px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;

  .is-button {
    flex-shrink: 0;
  }
}
</style>
