function addEventHandler(element, event, handler) {
  element.addEventListener(event, handler, false);
  return { element, event, handler };
}

export function setMouseOverWithDelay(elements, handler, delay) {
  let timers = {};
  let remove_events = [];

  let element_mouseover_handler = (event) => {
    if (delay) {
      let timer = setTimeout(() => {
        timers[timer] = null;
        handler();
      }, delay);
      timers[timer] = timer;
      remove_events.push(
        addEventHandler(event.target, 'mouseout', () => {
          clearTimeout(timer);
          timers[timer] = null;
        }),
      );
    } else handler();
  };

  elements.forEach((element) => {
    if (element)
      remove_events.push(
        addEventHandler(element, 'mouseover', element_mouseover_handler),
      );
  });

  return () => {
    // Очистка от таймеров
    Object.values(timers).forEach((timer) => {
      if (timer !== null) clearTimeout(timer);
    });
    // Очистка от событий mouseover
    remove_events.forEach((event_data) => {
      event_data.element.removeEventListener(
        event_data.event,
        event_data.handler,
        false,
      );
    });
  };
}

export function setMouseOutWithDelay(elements, handler, delay) {
  let timers = [];
  let remove_events = [];

  let element_mouseout_handler = () => {
    if (delay) {
      timers.push(setTimeout(() => handler(), delay));
    } else handler();
  };

  let element_mouseover_handler = () => {
    timers.forEach((timer) => clearTimeout(timer));
  };

  elements.forEach((element) => {
    if (element) {
      remove_events.push(
        addEventHandler(element, 'mouseout', element_mouseout_handler),
      );
      if (delay)
        remove_events.push(
          addEventHandler(element, 'mouseover', element_mouseover_handler),
        );
    }
  });

  return () => {
    // Очистка от таймеров
    timers.forEach((timer) => clearTimeout(timer));

    // Очистка от событий mouseover
    remove_events.forEach((event_data) => {
      event_data.element.removeEventListener(
        event_data.event,
        event_data.handler,
        false,
      );
    });
  };
}

export function setDelayBeforeEvent(handler, delay) {
  let timer;
  let cleanup = () => clearTimeout(timer);
  timer = setTimeout(() => (cleanup = handler()), delay);
  return () => cleanup();
}
