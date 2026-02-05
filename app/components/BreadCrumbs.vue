<template>
  <div v-if="projectInfo" class="BreadCrumbs">
    <ul class="BreadCrumbs-list">
      <li
        v-for="(link, idx) in breadCrumbsComp"
        :key="idx"
        class="BreadCrumbs-item"
      >
        <project-link
          v-if="
            (link.type === undefined && !link.href) || link.type === 'project'
          "
          class="BreadCrumbs-item-link"
          :title="$tTitle"
          :project="projectInfo"
          :to="{
            name: link.name,
            params: link.params,
          }"
        >
          <caption-string
            :title="$tTitle(link.title)"
            :value="link.title"
          ></caption-string>
        </project-link>

        <router-link
          v-else-if="link.type === 'router'"
          :to="{
            name: link.name,
            params: link.params,
          }"
          class="BreadCrumbs-item-link"
        >
          <caption-string
            :title="$tTitle(link.title)"
            :value="link.title"
          ></caption-string>
        </router-link>

        <component
          :is="link.type"
          v-else-if="link.type && typeof link.type !== 'string'"
          :name="link.name as any"
          class="BreadCrumbs-item-link"
        >
          <caption-string
            :title="$tTitle(link.title)"
            :value="link.title"
          ></caption-string>
        </component>

        <a
          v-else-if="link.href"
          :href="link.href"
          :target="link.target"
          class="BreadCrumbs-item-link"
        >
          <caption-string
            :title="$tTitle(link.title)"
            :value="link.title"
          ></caption-string>
        </a>
        &nbsp;/
      </li>
    </ul>
  </div>
</template>
<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { BreadCrumbsEntity } from '../logic/types/BreadCrumbs';
import ProjectLink from './Common/ProjectLink.vue';
import ProjectManager from '../logic/managers/ProjectManager';
import CaptionString from './Common/CaptionString.vue';
import UiManager from '../logic/managers/UiManager';
import { RoutesWithLangParam } from '../logic/router/routes-helpers';

export default defineComponent({
  name: 'BreadCrumbs',
  components: {
    ProjectLink,
    CaptionString,
  },
  props: {
    breadCrumbs: {
      type: Array as PropType<BreadCrumbsEntity[]>,
      default: null,
    },
  },
  computed: {
    breadCrumbsComp(): BreadCrumbsEntity[] {
      return this.breadCrumbs.map((link) => {
        if (RoutesWithLangParam.has(link.name)) {
          return {
            ...link,
            params: {
              lang: this.lang,
              ...(link.params ? link.params : {}),
            },
          };
        } else return link;
      });
    },
    lang() {
      return this.$getAppManager().get(UiManager).getLanguage();
    },
    projectInfo() {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
});
</script>
<style lang="scss" scoped>
.BreadCrumbs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0;
  padding: 0;
  color: var(--local-sub-text-color);
}
.BreadCrumbs-item {
  list-style: none;
  display: flex;
  align-items: center;
}
.BreadCrumbs-item-link,
.BreadCrumbs-separator {
  list-style: none;
  font-family: var(--local-font-family);
  font-size: 14px;
  font-weight: 400;
  line-height: 16.09px;
  text-align: left;
  color: var(--local-sub-text-color);
}

.BreadCrumbs-item-link {
  text-decoration: none;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
  }
}
</style>
