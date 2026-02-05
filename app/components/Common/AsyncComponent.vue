<template>
  <slot
    v-if="loadedComponent.component"
    name="default"
    :component="loadedComponent.component"
  ></slot>
</template>

<script lang="ts" type="text/ecmascript-6">
import {
  type Component,
  defineAsyncComponent,
  defineComponent,
  h,
  type PropType,
} from 'vue';

function makeErrorComponent(errorMessage: string, reload: () => void) {
  return () =>
    h(
      'div',
      {
        class: 'AsyncComponent-error error-message-block',
      },
      [
        h('i', {
          class: 'ri-refresh-line AsyncComponent-error-button',
          onClick: reload,
        }),
        errorMessage,
      ],
    );
}

export default defineComponent({
  name: 'AsyncComponent',
  components: {},
  props: {
    is: {
      type: [Function, Object, null] as PropType<
        (() => Promise<Component | null> | Component | null) | null
      >,
      required: true,
    },
  },
  emits: ['error'],
  data() {
    return {
      loadingEpoch: 0,
    };
  },
  computed: {
    loadedComponent() {
      const is_val = this.is;
      if (!is_val) {
        return {
          component: null,
          epoch: this.loadingEpoch,
        };
      }
      return {
        component: defineAsyncComponent({
          loader: async () => {
            try {
              const comp = await is_val();
              if (!comp) {
                return () => h('div');
              }
              return comp;
            } catch (err: any) {
              this.$emit('error', err);
              return makeErrorComponent(err.message, () => this.loadingEpoch++);
            }
          },
          loadingComponent: () =>
            h(
              'div',
              {
                class: 'AsyncComponent-loading',
              },
              [
                h('span', {
                  class: 'loaderSpinner',
                }),
              ],
            ),
        }),
        epoch: this.loadingEpoch,
      };
    },
  },
  methods: {
    reload() {},
  },
});
</script>

<style lang="scss" rel="stylesheet/scss">
.AsyncComponent-error-button {
  cursor: pointer;
}
</style>
