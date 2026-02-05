<template>
  <div class="AdvancedPropsSpoiler" :class="{ 'state-opened': openedState }">
    <div class="AdvancedPropsSpoiler-header" @click="toggle">
      {{ headerOfAdvancedProps }}
    </div>
    <div class="AdvancedPropsSpoiler-body ref-body">
      <slot></slot>
    </div>
  </div>
</template>

<script type="text/ecmascript-6">

export default {
    name:"AdvancedPropsSpoiler",
    components: {

    },
    props:{
        opened: {
            type: Boolean,
            default: () => false
        },
        header: {
            type: String,
            default: () => ''
        }
    },
    emits: {'update:opened': null},
    data(){
        return {
            openedState: this.opened
        }
    },
    computed:{
        headerOfAdvancedProps(){
            return this.header ? this.header : this.$t('common.components.advancedOptions')
        }
    },
        watch:{
            opened(){
                if (this.openedState !== this.opened) this.openedState = this.opened;
            }
        },
        methods:{
            toggle(){
                this.openedState = !this.openedState;
                if (this.openedState !== this.opened) this.$emit('update:opened', this.openedState)
            }
        }
}
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.AdvancedPropsSpoiler-header {
  cursor: pointer;
  position: relative;
  font-size: var(--local-font-size);
  font-weight: 500;
  padding-left: 21px;
  color: var(--local-sub-text-color);
  &:hover {
    color: var(--local-text-color);
  }
  &:after {
    content: '';
    display: block;
    width: 0px;
    height: 0px;
    border: 5px solid transparent;
    border-top-color: var(--local-sub-text-color);
    position: absolute;
    left: 0px;
    top: 11px;
  }
}
.AdvancedPropsSpoiler-body {
  display: none;
  padding-top: 20px;
}
.AdvancedPropsSpoiler.state-opened {
  .AdvancedPropsSpoiler-body {
    display: block;
  }
  .AdvancedPropsSpoiler-header:after {
    border-top-color: transparent;
    border-bottom-color: var(--local-sub-text-color);
    top: 5px;
  }
}
</style>
