import type { DirectiveBinding } from 'vue';
import { addLogicalParentFocusInListener } from '#components/utils/logical-tree';

const storedInfo = new Map<
  HTMLElement,
  {
    val: (ev: FocusEvent) => void | null;
    listener: { remove: () => void };
  }
>();

function updateOrBind(
  el: HTMLElement,
  binding_value: (ev: FocusEvent) => void | null,
) {
  let cm = storedInfo.get(el);
  if (!cm) {
    cm = {
      val: binding_value,
      listener: addLogicalParentFocusInListener(el, (ev) => {
        if (cm && cm.val) {
          cm.val(ev);
        }
      }),
    };
    storedInfo.set(el, cm);
  } else {
    cm.val = binding_value;
  }
}

export default {
  mounted: function (el: HTMLElement, binding: DirectiveBinding) {
    updateOrBind(el, binding.value);
  },
  updated: function (el: HTMLElement, binding: DirectiveBinding) {
    updateOrBind(el, binding.value);
  },
  unmounted: function (el: HTMLElement, _binding: DirectiveBinding) {
    const cm = storedInfo.get(el);
    if (!cm) return;
    cm.listener.remove();
    storedInfo.delete(el);
  },
};
