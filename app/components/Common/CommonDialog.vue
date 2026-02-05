<template>
  <div class="CommonDialog">
    <slot></slot>
  </div>
</template>

<script type="text/ecmascript-6">

export default {
    name: "CommonDialog",
    props:{
        dialog: { type: Object, default: () => {}},
        dialogTemplate: { type: Object, default: () => {}}
    },
        emits: ['dialog-parameters'],
        computed:{
            dialogProps(){
                return this.dialog && this.dialog.props ? { ...this.dialog.props} : {};
            }
        },
    mounted(){
        if (this.dialog.state.forbidClose){
            this.$emit('dialog-parameters', {
                forbidClose: true
            })
        }
    },
    methods:{
        choose(val){
            this.dialog.close(val);
        }
    },
}
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.CommonDialog {
  margin-bottom: 20px;
  min-width: 300px;
  min-height: 300px;
  background: #fff;
}
</style>
