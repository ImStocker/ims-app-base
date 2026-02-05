<template>
  <div class="SortableList">
    <slot name="prepend"></slot>
    <div
      v-for="(item, item_index) in list"
      :key="getIdKey(item)"
      v-bind-object-directive="item"
      class="SortableList-item"
      :class="getItemClassName ? getItemClassName(item) : null"
    >
      <slot :item="item" :index="item_index"></slot>
    </div>
    <slot name="append"></slot>
  </div>
</template>

<script type="text/ecmascript-6">
import Sortable from 'sortablejs';

const bindObjectDirective = function (el, binding) {
    el.__SortableList_item = binding.value
};

export default {
    name:'SortableList',
    directives:{
        bindObjectDirective
    },
    props:{
        list: { type: Array, default: () => []},
        idKey: { type: [String, Function], default: "id" },
        handleSelector: { type: [Object, String], default: () => {}},
        disabled: { type: Boolean, default: false },
        setDataTransferCallback: { type: Function, default: null },
        getItemClassName: { type: Function, default: null }
    },
    emits: ['update:list'],
    watch:{
        disabled(){
            if (!this._sortable) return;
            this._sortable.option("disabled", this.disabled);
        }
    },
    mounted(){
        const sortable_opts = {
            animation: 150,
            delay: 100,
            delayOnTouchOnly: true,
            disabled: this.disabled,
            draggable: '.SortableList-item',
            onSort: () => {
                if (!this.$el) return;
                const new_list = [];
                for (let i = 0; i < this.$el.children.length; i++){
                    if (this.$el.children[i].__SortableList_item){
                        new_list.push(this.$el.children[i].__SortableList_item)
                    }
                }
                this.$emit('update:list', new_list);
            },
            onStart: () => {
                this.$el.classList.add('state-dragging');
            },
            onEnd: () => {
                this.$el.classList.remove('state-dragging');
            },

        };
        if (this.setDataTransferCallback) sortable_opts.setData = this.setDataTransferCallback;
        if (this.getItemClassName) sortable_opts.getItemClassName = this.getItemClassName;
        if (this.handleSelector) sortable_opts.handle = this.handleSelector;
        this._sortable = new Sortable(this.$el, sortable_opts);
    },
    methods: {
      getIdKey(obj){
        if (typeof this.idKey === 'function') return this.idKey(obj)
        else return obj[this.idKey];
      }
    },
    destroy(){
        if (this._sortable) this._sortable.destroy();
    }
}
</script>
