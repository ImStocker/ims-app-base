import {
  type Component,
  type AppContext,
  h,
  type DefineComponent,
  render,
} from 'vue';

type RenderedComponent = {
  inner: HTMLElement;
  root: HTMLElement;
  destroy: () => void;
};

export class InnerComponentRenderer<T extends Component> {
  private renderedInstances = new Map<HTMLElement, RenderedComponent>();

  constructor(
    private selector: string,
    private component: T,
    private propsReader: (
      element: HTMLElement,
    ) => Record<string, any> = () => ({}),
    private replace = false,
  ) {}

  render(appContext: AppContext, target: Element) {
    const found_elements = target.querySelectorAll<HTMLElement>(this.selector);

    const old_instances = new Set<HTMLElement>(this.renderedInstances.keys());
    for (const element of found_elements) {
      const rendered_instance = this.renderedInstances.get(element);
      if (rendered_instance) {
        old_instances.delete(element);
      } else {
        const vNodeProps = this.propsReader(element);
        if (this.replace) {
          vNodeProps.class = element.className;
        }
        const vNode = h(this.component as DefineComponent, {
          ...vNodeProps,
          onDestroy: (text: string) => {
            if (text) {
              const replacement_span = document.createElement('SPAN');
              replacement_span.innerText = text;
              rendered_compoment.root.insertAdjacentElement(
                'afterend',
                replacement_span,
              );
            }
            rendered_compoment.destroy();
            rendered_compoment.root.remove();
          },
        });
        let inner = element.querySelector<HTMLElement>(
          'span[contenteditable="false"]',
        );
        if (!inner) inner = element;
        inner.innerHTML = '';
        vNode.appContext = appContext;
        render(vNode, inner);
        let key_element = element;

        let root = element;
        if (this.replace) {
          const replacement = inner.children[0] as HTMLElement;
          if (replacement) {
            for (const [dataset_key, dataset_val] of Object.entries(
              element.dataset,
            )) {
              replacement.dataset[dataset_key] = dataset_val;
            }
            for (let i = 0; i < element.style.length; i++) {
              const style_name = element.style[i];
              replacement.style[style_name] = element.style[style_name];
            }
            inner.removeChild(replacement);
            element.replaceWith(replacement);
            root = replacement;
            key_element = replacement;
          }
        }

        const rendered_compoment: RenderedComponent = {
          inner,
          root,
          destroy: () => {
            if (inner) {
              render(null, inner);
            }
          },
        };
        this.renderedInstances.set(key_element, rendered_compoment);
      }
    }

    for (const left_elem of old_instances) {
      const rendered_component = this.renderedInstances.get(left_elem);
      if (rendered_component) {
        rendered_component.destroy();
        this.renderedInstances.delete(left_elem);
      }
    }
  }

  destroy() {
    const rendered_instances = [...this.renderedInstances.values()];
    this.renderedInstances = new Map();
    for (const rendered_component of rendered_instances) {
      rendered_component.destroy();
    }
  }
}
