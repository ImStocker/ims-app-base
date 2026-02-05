<template>
  <div
    class="DialogHostDialog large-scrollbars"
    :class="dialogClasses"
    @mousedown.self="overlayMouseDown"
    @mouseup.self="overlayMouseUp"
  >
    <div class="DialogHostDialog-center">
      <transition name="DialogHostDialogAnim" @after-enter="shownDone = true">
        <div
          v-if="shown"
          ref="container"
          class="DialogHostDialog-container"
          :data-dialog-id="dialog.id"
        >
          <div class="DialogHostDialog-content">
            <component
              :is="dialog.component"
              ref="dialogInstance"
              :dialog="dialogInterface"
              @dialog-parameters="applyDialogParameters(dialog, $event)"
              @dialog-busy="applyDialogBusy(dialog, $event)"
            />
            <div class="DialogHostDialog-busy" />
          </div></div
      ></transition>
    </div>
  </div>
</template>

<script type="text/ecmascript-6">
import { assignLogicalParent } from '../utils/logical-tree';


    export default {
        name: "DialogHostDialog",
        provide(){
          return {
              dialog: this.dialogInterface,
              overlayMouseDownTime: 0,
              getRightPanel: () => {
                if (!this.$el) return null;
                if (!this._rightPanelDiv){
                  this._rightPanelDiv = document.createElement('DIV');
                  this._rightPanelDiv.className = 'right-panel';
                  this.$el.appendChild(this._rightPanelDiv);
                }
                return this._rightPanelDiv;
              },
              getDropdownHost: () => {
                if (!this.$el) return null;
                if (!this._dropdownHost){
                  this._dropdownHost = document.createElement('DIV');
                  this._dropdownHost.className = 'dropdown-host';
                  this.$el.appendChild(this._dropdownHost);
                }
                return this._dropdownHost;
              }
          };
        },
        props: {
          dialog: { type: Object, required: true }
        },
        data(){
          return {
            shown: false,
            shownDone: false
          }
        },
        computed:{
          dialogInterface(){
              return {
                state: this.dialog.state,
                close: (res, force) => this.closeDialog(true, res, force),
                parameters: this.dialog.parameters,
                addBeforeCloseMethod: (func) => {
                    // eslint-disable-next-line vue/no-mutating-props
                    if (!this.dialog.parameters.beforeClose) this.dialog.parameters.beforeClose = [];
                    const ind = this.dialog.parameters.beforeClose.indexOf(func);
                    if (ind < 0) {
                        // eslint-disable-next-line vue/no-mutating-props
                        this.dialog.parameters.beforeClose.push(func);
                    }
                },
                removeBeforeCloseMethod: (func) => {
                    if (!this.dialog.parameters.beforeClose) return;
                    const ind = this.dialog.parameters.beforeClose.indexOf(func);
                    if (ind >= 0) {
                        // eslint-disable-next-line vue/no-mutating-props
                        this.dialog.parameters.beforeClose.splice(ind, 1);
                    }
                },
                elements: () => {
                  return {
                      host: this.$el,
                      container: this.$refs['container'],
                  }
                }
              }
          },
          dialogClasses(){
              let dialog_name = typeof this.dialog.componentName === "object" ? this.dialog.componentName.name : this.dialog.componentName;
              if (!dialog_name && this.dialog.component){
                dialog_name = this.dialog.component.name;
              }
              const classes = {
                  'state-closable': this.dialog.ready && !this.dialog.parameters.forbidClose,
                  'state-busy': this.dialog.ready && this.dialog.busy,
                  ['DialogHost-component-' + dialog_name]: true
              };
              if (!this.shownDone) classes['state-enter-anim'] = true;
              if (this.dialog.parameters.customClass) classes[this.dialog.parameters.customClass] = true;
              return classes;
          }
        },
        async mounted(){
          this.shown=  true;
          await this.dialogInit(this.dialog)
        },
        unmounted(){
            this.dialogDeinit(this.dialog)
        },
        methods: {
            async dialogInit(dialog){
                if (!dialog) return;
                dialog.ready = true;
                if (dialog.pendingClose) {
                    if (!dialog.parameters.forbidClose) dialog.close(dialog.parameters.defaultCloseValue);
                    else dialog.pendingClose = false;
                    return;
                }
                await this.$nextTick();
                dialog.onDialogMounted(this.$refs.dialogInstance);
                if (dialog.opener && dialog.opener.$el){
                    assignLogicalParent(this.$el, dialog.opener.$el)
                }
            },
            dialogDeinit(dialog){
                if (!dialog) return;
                dialog.dialogComponentInstance = null;
                assignLogicalParent(this.$el, null);
            },

            closeDialog(explicit, value, force = false){
                const dialog = this.dialog;
                if (!dialog) return;
                if (!force && dialog.busy) return;
                if (!explicit && !force && dialog.parameters.forbidClose) return;
                dialog.pendingClose = true;
                if (dialog.ready) {
                  this.shown = false
                  dialog.close(value)
                }
            },
            applyDialogParameters(dialog, parameters){
                if (!dialog) return;
                dialog.parameters = Object.assign(dialog.parameters, parameters);
            },
            applyDialogBusy(dialog, busy){
                // Сбросить фокус
                if (busy && document.activeElement) document.activeElement.blur();
                dialog.busy = busy;
            },
            overlayMouseDown(){
                this.overlayMouseDownTime = Date.now();
            },
            overlayMouseUp(){
                if (Date.now() - this.overlayMouseDownTime < 500) {
                    this.closeDialog(false, this.dialog.parameters.defaultCloseValue)
                }
            }
        }
    }
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/devices-mixins.scss';

.DialogHostDialog {
  &.state-enter-anim {
    overflow: hidden !important;
  }
  &:not(.state-enter-anim) {
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  position: fixed;
  outline: none !important;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  cursor: default;
  z-index: 500;

  &.state-current {
    z-index: 2000;
    .DialogHostDialog-content {
      pointer-events: auto;
    }
  }

  .DialogHostDialog-busy {
    display: none;
    opacity: 0;
    position: absolute;
    background: #363633; //$dialog-host-dialog-content-background;
    color: #fff;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
  }
  &.state-busy {
    .DialogHostDialog-busy {
      display: block;
      opacity: 0.6;
      animation: DialogHost-busy-fade-in 1s ease-out;
      z-index: 1000;
    }
  }

  &:not(.state-disable-mb-layout) {
    @include devices-mixins.device-type(not-pc) {
      .DialogHostDialog-content {
        width: 100%;
        box-sizing: border-box;
      }
      .DialogHostDialog-container {
        display: block;
        left: 0px;
      }
      .DialogHostDialog-center {
        display: flex;
        flex-direction: column;
        &:after {
          content: '';
          display: block;
          height: auto;
          flex: 1;
        }
        &:before {
          height: auto;
          flex: 1;
        }
      }
    }
  }
}

.DialogHostDialog-center {
  pointer-events: none;
  text-align: center;
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  padding: 0 8px;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
  &:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
    margin-left: -100%;
  }
}
.DialogHostDialog-container {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  left: 50%;
}
.DialogHostDialog-content {
  position: relative;
  margin: 10px auto;
  text-align: left;
  cursor: initial;
  font-family: var(--local-font-family);
}

.DialogHostDialogAnim-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.DialogHostDialogAnim-enter-from {
  opacity: 0;
}

.DialogHostDialogAnim-enter-from {
  transform: translateY(20px) scale(0.95);
}
</style>
<style lang="scss" rel="stylesheet/scss"></style>
