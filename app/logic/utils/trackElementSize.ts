export type TrackElementSizeHandler = {
  cancel: () => void;
};

export function trackElementSize(
  el: HTMLElement,
  callback: (size: { width: number; height: number }) => void,
  immediately = true,
): TrackElementSizeHandler {
  let last_size: { width: number; height: number } | null = null;
  const upd_size = () => {
    const new_size = {
      width: el.clientWidth,
      height: el.clientHeight,
    };
    if (
      !last_size ||
      Math.abs(new_size.width - last_size.width) > 0.001 ||
      Math.abs(new_size.height - last_size.height) > 0.001
    ) {
      callback(new_size);
      last_size = new_size;
    }
  };

  let resizeObserver: ResizeObserver | undefined = undefined;
  let mutationObserver: MutationObserver | undefined = undefined;
  let interval: NodeJS.Timeout | undefined = undefined;
  if (window.ResizeObserver !== undefined) {
    resizeObserver = new window.ResizeObserver(() => upd_size());
    resizeObserver.observe(el);
  } else if (window.MutationObserver !== undefined) {
    mutationObserver = new window.MutationObserver(() => upd_size());
    mutationObserver.observe(el, {
      subtree: true,
      childList: true,
    });
  } else {
    interval = setInterval(upd_size, 1000);
  }

  if (immediately) {
    upd_size();
  }

  return {
    cancel: () => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = undefined;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = undefined;
      }
    },
  };
}
