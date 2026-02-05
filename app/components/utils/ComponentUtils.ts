type AnyFunction<T> = (this: T, ...args: any[]) => any;

export function debounceForThis<F extends AnyFunction<T>, T>(
  func: F,
  wait = 100,
  immediate = false,
): (...args: Parameters<F>) => void {
  const this_contexts = new Map();

  return function (this: T, ...args: Parameters<F>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let context = this_contexts.get(self);
    if (!context) {
      context = {
        self,
        args: null,
        timestamp: null,
        timer: null,
      };
      this_contexts.set(self, context);
    }
    context.timestamp = Date.now();
    context.args = args;
    if (!context.timer) {
      const call_now = immediate && !context.timer;
      const later = () => {
        const left = context.timestamp + wait - Date.now();
        if (left > 0) {
          context.timer = setTimeout(later, left);
        } else {
          context.timer = null;
          if (!immediate) {
            func.apply(context.self, context.args);
          }
        }
      };
      context.timer = setTimeout(later, wait);
      if (call_now) func.apply(context.self, context.args);
    }
  };
}
