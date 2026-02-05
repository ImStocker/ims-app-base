export default {
  imsDialogEditor: {
    nodes: {
      speech: {
        title: 'Реплика',
        description: 'Реплика диалога или какое-то сообщение',
      },
      start: {
        title: 'Старт',
        description: 'Точка старта сценария',
      },
      end: {
        title: 'Конец',
        description: 'Конец сценария',
      },
      chance: {
        title: 'Шанс',
        description: 'Случайный выбор одного из путей сценария',
      },
      timer: {
        title: 'Таймер',
        description: 'Подождем минутку, другую',
      },
      trigger: {
        title: 'Триггер',
        description: 'Вызов какого-то внутриигрового действия',
      },
      branch: {
        title: 'Условие',
        description: 'Выбор одного из путей сценария в зависимости от условия',
      },
      setVar: {
        title: 'Задать переменную',
        description: 'Задать значение переменной во время выполнения',
      },
      getVar: {
        title: 'Получить переменную',
        description: 'Получить значение переменной во время выполнения',
      },
      opEqual: {
        title: 'Равно (x = y)',
        description: 'Проверить, равен ли первый аргумент второму',
      },
      opNotEqual: {
        title: 'Не равно (x ≠ y)',
        description: 'Проверить, неравенство аргументом',
      },
      opLess: {
        title: 'Меньше (x < y)',
        description: 'Проверить, меньше ли первый аргумент второго',
      },
      opLessEqual: {
        title: 'Меньше или равно (x ≤ y)',
        description: 'Проверить, меньше или равен первый аргумент второму',
      },
      opMore: {
        title: 'Больше  (x > y)',
        description: 'Проверить, больше ли первый аргумент второго',
      },
      opMoreEqual: {
        title: 'Больше или равно (x ≥ y)',
        description: 'Проверить, больше или равен первый аргумент второму',
      },
      opPlus: {
        title: 'Сложение (x + y)',
        description: 'Возвращает результат сложения двух аргументов',
      },
      opMinus: {
        title: 'Вычитание (x - y)',
        description: 'Возвращает результат вычитания двух аргументов',
      },
      opMult: {
        title: 'Умножение (x * y)',
        description: 'Возвращает результат умножения двух аргументов',
      },
      opDiv: {
        title: 'Деление (x / y)',
        description: 'Возвращает результат деления двух аргументов',
      },
      opMod: {
        title: 'Остаток от деления (x % y)',
        description: 'Возвращает остаток от деления двух аргументов',
      },
      opAnd: {
        title: 'Логическое И (x && y)',
        description: 'Возвращает логическое И между аргументами',
      },
      opOr: {
        title: "Логическое ИЛИ (x {'|'}{'|'} y)",
        description: 'Возвращает логическое ИЛИ между аргументами',
      },
      opNot: {
        title: 'Логическое НЕ (!x)',
        description: 'Возвращает логическое НЕ от аргумента',
      },
      constBoolean: {
        title: 'Логическое значение',
        description: 'Логическое значение',
      },
      constInteger: {
        title: 'Целое значение',
        description: 'Целое значение',
      },
      constFloat: {
        title: 'Вещественное значение',
        description: 'Вещественное значение',
      },
      constString: {
        title: 'Строковое значение',
        description: 'Строковое значение',
      },
      constText: {
        title: 'Текстовое значение',
        description: 'Текстовое значение',
      },
      constAsset: {
        title: 'Значение-элемент',
        description: 'Значение-элемент',
      },
    },
    speech: {
      add: 'Добавить',
      addOption: 'Добавить опцию',
      character: 'Персонаж',
      enterSpeech: 'Введите реплику',
      deleteOption: 'Удалить опцию',
      deleteOptionConfirm: 'Вы уверены, что хотите удалить опцию?',
      enterText: 'Введите текст',
      addOptionCondition: 'Добавить условие',
      deleteOptionCondition: 'Удалить условие у опции',
      deleteOptionConditionConfirm:
        'Вы уверены, что хотите удалить условие у опции?',
      parameters: 'Параметры реплики',
      speechProperties: 'Свойства реплики',
      responseOptionsProperties: 'Свойства опций ответа',
      autoSubstitutionHelpText:
        'Автоматически подставлять значение из предыдущего узла реплики',
      attachCover: 'Добавить изображение-обложку',
      dettachCover: 'Удалить обложку',
      dettachCoverConfirm:
        'Вы уверены, что хотите удалить изображение-обложку?',
    },
    dataFields: {
      condition: 'Условие',
      value: 'Значение',
      yes: 'Да',
      no: 'Нет',
    },
    common: {
      noValue: 'Не задано',
    },
    addStartLevelHint:
      'В сценарии нет стартового узла. Кликните правой кнопкой мыши по полю, чтобы создать узел',
    trigger: {
      addInputParameter: 'Добавить входной параметр',
      addOutputParameter: 'Добавить выходной параметр',
      parameterAlreadyExists: 'Параметр уже существует',
      deleteParameter: 'Удалить параметр',
      changeParameter: 'Изменить параметр',
      duplicateParameter: 'Дублировать параметр',
    },
    var: {
      manageVariables: 'Управлять переменными',
      editVariable: 'Редактировать переменную',
      duplicateVariable: 'Дублировать переменную',
      deleteVariable: 'Удалить переменную',
      deleteVariableConfirm: 'Вы уверены, что хотите удалить переменную?',
      createVariable: 'Создать переменную',
      variableAlreadyExists: 'Переменная уже существует',
      nameIsEmpty: 'Название не задано',
      noVariablesYet: 'У вас пока нет переменных',
      name: 'Название',
      type: 'Тип',
      description: 'Описание',
      enterName: 'Введите название',
      enterType: 'Выберите тип',
      enterDescription: 'Введите описание',
      types: {
        any: 'Любой',
        boolean: 'Логическое',
        integer: 'Целое',
        float: 'Вещественное',
        text: 'Текст',
        string: 'Строка',
        asset: 'Элемент',
      },
    },
    play: {
      play: 'Запустить',
      playDemo: 'Запусть в режиме демонстрации',
      playDebug: 'Запусть в режиме отладки',
      switchDemo: 'Переключить в режим презентации',
      switchDebug: 'Переключить в режим отладки',
      pause: 'Пауза',
      resume: 'Возобновить',
      stop: 'Остановить',
      continue: 'Продолжить',
      select: 'Выбрать',
      restart: 'Перезапустить',
      stepBack: 'Шаг назад',
      stepForward: 'Шаг вперед',
    },
    contents: {
      varGet: 'Получить',
      varSet: 'Задать',
    },
  },
};
