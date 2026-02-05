// Если родительский элемент не привязал указанные свойства,
// свойства будут созданы автоматически
export default function (component) {
  //if (component.$props) throw new Error("componentAutoBindProps: must be called in beforeCreate hook");
  let should_bind_props = [];

  // props.forEach(prop => {
  //     if (!component.$options.props || !component.$options.props.hasOwnProperty(prop)) throw new Error("componentAutoBindProps: property '" + prop + "' not found");
  //     let is_bind = component.$options.hasOwnProperty('propsData') && component.$options.propsData.hasOwnProperty(prop);
  //     if (!is_bind) should_bind_props.push(prop);
  // });

  if (should_bind_props.length > 0) {
    let listeners = [];

    // Создаем новую конфигурацию компонента
    let new_options = Object.assign(
      Object.create({
        ...Object.getPrototypeOf(component.$options),
        props: { ...component.$options.props },
      }),
      component.$options,
    );

    should_bind_props.forEach((prop) => {
      // Вычисление значения по-умолчанию
      let default_val = new_options.props[prop].default;
      if (typeof default_val == 'function')
        default_val = default_val.call(component);

      // Удалить свойство, сделать его $data
      delete new_options.props[prop];
      let original_data = new_options.data;
      new_options.data = function () {
        let data =
          typeof original_data == 'function'
            ? original_data.call(component)
            : original_data;
        if (!data) data = {};
        data[prop] = default_val;
        return data;
      };

      // Регистрация события изменения
      let change_listener = {
        event: 'update:' + prop,
        func: (val) => (component[prop] = val),
      };
      component.$on(change_listener.event, change_listener.func);
      listeners.push(change_listener);
    });

    component.$options = new_options;

    // Очистка
    component.$once('hook:beforeDestroy', () => {
      listeners.forEach((listener) => {
        component.$off(listener.event, listener.func);
      });
      listeners = [];
    });
  }
}
