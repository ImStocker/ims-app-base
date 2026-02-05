<template>
  <a :href="href" :target="target" @click="click"><slot /></a>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { ServiceLinkVariants } from '../../logic/router/routes-helpers';
import { getServiceLink } from '../../logic/router/routes-helpers';
import UiManager from '../../logic/managers/UiManager';

export default defineComponent({
  name: 'ServiceLink',
  props: {
    name: { type: String as PropType<ServiceLinkVariants>, required: true },
    target: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    query: {
      type: Object as PropType<Record<string, string>>,
      default: () => null,
    },
  },
  emits: ['click'],
  computed: {
    lang() {
      return this.$getAppManager().get(UiManager).getLanguage();
    },
    href() {
      if (typeof this.link === 'string') return this.link;
      else return this.$router.resolve(this.link).fullPath;
    },
    link() {
      return getServiceLink(this.name, this.lang, this.query);
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
