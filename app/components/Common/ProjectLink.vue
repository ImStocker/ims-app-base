<template>
  <a
    :href="href"
    :target="target"
    :class="{ 'router-link-active': activeClass }"
    @click="click"
  >
    <slot></slot>
  </a>
</template>

<script type="text/ecmascript-6" lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { RouteLocationNamedRaw } from 'vue-router';
import type { ProjectInfoForLink } from '../../logic/router/routes-helpers';
import {
  getProjectLink,
  isSubHrefOfCurrentUrl,
} from '../../logic/router/routes-helpers';

export default defineComponent({
  name: 'ProjectLink',
  props: {
    project: { type: Object as PropType<ProjectInfoForLink>, required: true },
    to: {
      type: [Object, String] as PropType<RouteLocationNamedRaw>,
      required: true,
    },
    target: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    exact: { type: Boolean, default: false },
  },
  emits: ['click'],
  computed: {
    href() {
      if (typeof this.link === 'string') return this.link;
      else return this.$router.resolve(this.link).fullPath;
    },
    link() {
      return getProjectLink(this.$router, this.project, this.to);
    },
    activeClass() {
      return isSubHrefOfCurrentUrl(this.href, this.exact, this.$router);
    },
  },
  methods: {
    click(e: MouseEvent) {
      this.$emit('click', e);
      if (!e.defaultPrevented && typeof this.link !== 'string') {
        if (this.target === '_blank') {
          window.open(this.href, '_blank');
        } else {
          this.$router.push(this.link);
        }
        e.preventDefault();
      }
    },
  },
});
</script>
