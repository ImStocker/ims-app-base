<template>
  <div :class="{ DialogHost: true, 'state-not-empty': hasDialogs }">
    <div class="DialogHost-overlay" />
    <div
      v-for="(dialog, dialog_index) of dialogs"
      :key="dialog.id"
      class="DialogHost-one"
      :class="prevDialogSameClass(dialog_index)"
    >
      <dialog-host-one-dialog
        :dialog="dialog"
        :class="{ 'state-current': dialog == currentDialog }"
      />
    </div>
  </div>
</template>

<script type="text/ecmascript-6">
import DialogManager from '../../logic/managers/DialogManager';
import DialogHostOneDialog from './DialogHostDialog.vue';

// Список классов, которые позволяют игнорировать требования нахождения внутри активного диалога, чтобы сфокусироваться
const allowed_focus_classes = [];

// Предотвращает возможность сфокусироваться на элементе, который находится вне активного диалога
function focus_guard(self, e){
    function recursive_allow_parent(element){
        // Не узел DOM
        if (!element.getAttribute) return false;

        // Проверка id диалога
        const dialog_id = element.getAttribute('data-dialog-id');
        if (dialog_id){
            if (dialog_id == self.currentDialog.id) return true;
            else return false; // Принадлежит другому диалогу
        }

        // Разрешенные классы
        if (element.classList && allowed_focus_classes.some(cl => element.classList.contains(cl))){
            return true;
        }

        // Проверка родителей
        return element.parentNode ? recursive_allow_parent(element.parentNode) : false;
    }

    const prevent_focus = self.currentDialog && (self.currentDialog.busy || !recursive_allow_parent(e.target));

    if (prevent_focus){
        e.target.blur();
        e.preventDefault();
        e.stopPropagation();
    }
}

export default {
    // Добавляет класс, который позволяет игнорировать требования нахождения внутри активного диалога, чтобы сфокусироваться
    AddAllowFocusClass(class_name){
        allowed_focus_classes.push(class_name);
    },
    components:{
        DialogHostOneDialog,
    },
    // eslint-disable-next-line vue/require-prop-types
    props: [ 'dialogs' ],
    computed:{
        hasDialogs(){
            return this.dialogs && this.dialogs.length > 0;
        },
        currentDialog(){
            return this.hasDialogs ? this.dialogs[this.dialogs.length - 1] : null;
        }
    },
    watch:{
        hasDialogs(){
            // Сбросить фокус
            if (document.activeElement) document.activeElement.blur();
            // Класс, ели открыт хотя бы один диалог
            if (this.dialogs.length > 0) {
                if (document.body.clientHeight < document.body.scrollHeight){
                    document.body.classList.add('state-dialog-disable-scroll');
                }
            }
            else document.body.classList.remove('state-dialog-disable-scroll');
        },
    },
    mounted(){
        this.$getAppManager().get(DialogManager).dialogHost = this;
    },
    unmounted(){
        if (this._focus_guard_handler) {
            document.removeEventListener('focusin', this._focus_guard_handler, false);
        }
    },
    methods:{
        prevDialogSameClass(dialog_index){
            let deep = 0;
            while (dialog_index > 0 &&
                this.dialogs[dialog_index - 1].componentName == this.dialogs[dialog_index].componentName)
            {
                deep++;
                dialog_index--;
            }
            if (deep > 0){
                return ['state-prev-same', 'state-prev-same-deep' + ((deep - 1) % 5 + 1)]
            }
            else return []
        },
        whichDialog(component_or_node){
            const recursive_search = (element) => {
                if (!element.getAttribute) return null;
                const dialog_id = element.getAttribute('data-dialog-id');
                if (dialog_id){
                    for (const dialog of this.dialogs){
                        if (dialog.id == dialog_id) return dialog;
                    }
                    return null;
                }
                return element.parentNode ? recursive_search(element.parentNode) : null;
            };
            return recursive_search(component_or_node.$el ? component_or_node.$el : component_or_node);
        }
    },
    ready(){
        this._focus_guard_handler = (e) => focus_guard(this, e);
        document.addEventListener('focusin', this._focus_guard_handler, false);
    }
}
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.DialogHost-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  background: #6b6b63;
  opacity: 0;
  z-index: 1000;
}

.DialogHost.state-not-empty .DialogHost-overlay {
  display: block;
  opacity: 0.6;
  animation: DialogHost-overlay-fade-in 0.5s ease-out;
}
</style>

<style lang="scss" rel="stylesheet/scss">
@keyframes DialogHost-overlay-fade-in {
  0% {
    display: none;
    opacity: 0;
  }
  1% {
    display: block;
    opacity: 0;
  }
  100% {
    display: block;
    opacity: 0.6;
  }
}
@keyframes DialogHost-overlay-blur {
  0% {
    filter: blur(0);
  }
  100% {
    filter: blur(6px);
  }
}
@keyframes DialogHost-busy-fade-in {
  0% {
    display: none;
    opacity: 0;
  }
  1% {
    display: block;
    opacity: 0;
  }
  100% {
    display: block;
    opacity: 0.6;
  }
}
.DialogHost-one.state-prev-same {
  .DialogHostDialog-content {
    position: relative;
  }
  @for $i from 1 through 5 {
    &.state-prev-same-deep#{$i} {
      .DialogHostDialog-content {
        top: 10px * $i;
      }
    }
  }
}
body.state-dialog-opened {
  .DialogHost-blurTarget {
    animation: DialogHost-overlay-blur 0.5s ease-out;
    filter: blur(6px);
  }
}
</style>
