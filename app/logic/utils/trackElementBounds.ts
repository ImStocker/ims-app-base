import {
  trackElementSize,
  type TrackElementSizeHandler,
} from './trackElementSize';

export type TrackElementBoundsHandler = {
  cancel: () => void;
};

export function trackElementBounds(
  el: HTMLElement,
  callback: (bbox: DOMRect) => void,
  immediately = true,
): TrackElementBoundsHandler {
  let handlers: {
    target: EventTarget;
    event: string;
    listener: () => void;
  }[] = [];

  let last_bbox: DOMRect | null = null;
  const upd_bbox = () => {
    const new_bbox = el.getBoundingClientRect();
    if (
      !last_bbox ||
      Math.abs(new_bbox.left - last_bbox.left) > 0.001 ||
      Math.abs(new_bbox.top - last_bbox.top) > 0.001 ||
      Math.abs(new_bbox.right - last_bbox.right) > 0.001 ||
      Math.abs(new_bbox.bottom - last_bbox.bottom) > 0.001
    ) {
      callback(new_bbox);
      last_bbox = new_bbox;
    }
  };
  window.addEventListener('scroll', upd_bbox, { passive: true });
  handlers.push({
    target: window,
    event: 'scroll',
    listener: upd_bbox,
  });
  window.addEventListener('resize', upd_bbox, { passive: true });
  handlers.push({
    target: window,
    event: 'resize',
    listener: upd_bbox,
  });

  let target_parent = el.parentElement;
  while (target_parent) {
    const overflow_y = (window.getComputedStyle(target_parent) as any)[
      'overflow-y'
    ];
    const overflow_x = (window.getComputedStyle(target_parent) as any)[
      'overflow-x'
    ];
    const has_scroll =
      overflow_y === 'auto' ||
      overflow_y === 'scroll' ||
      overflow_y === 'hidden' ||
      overflow_x === 'auto' ||
      overflow_x === 'scroll' ||
      overflow_x === 'hidden';
    if (has_scroll) {
      target_parent.addEventListener('scroll', upd_bbox, { passive: true });
      handlers.push({
        target: target_parent,
        event: 'scroll',
        listener: upd_bbox,
      });
    }

    target_parent = target_parent.parentElement;
  }

  let interval: NodeJS.Timeout | null = setInterval(upd_bbox, 1000);

  let size_tracker: TrackElementSizeHandler | null = trackElementSize(
    el,
    () => upd_bbox,
  );

  if (immediately) {
    upd_bbox();
  }

  return {
    cancel: () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (size_tracker) {
        size_tracker.cancel();
        size_tracker = null;
      }
      if (handlers.length > 0) {
        for (const h of handlers) {
          h.target.removeEventListener(h.event, h.listener);
        }
        handlers = [];
      }
    },
  };
}
