export default {
  imsDialogEditor: {
    nodes: {
      speech: {
        title: 'Speech',
        description: 'Just one line of the dialog or some message',
      },
      start: {
        title: 'Start',
        description: 'Start point of the script',
      },
      end: {
        title: 'End',
        description: 'End of the script',
      },
      chance: {
        title: 'Chance',
        description: 'Randomly select one of the script path',
      },
      timer: {
        title: 'Timer',
        description: 'Wait a second, or a couple',
      },
      trigger: {
        title: 'Trigger',
        description: 'Call some in-game action',
      },
      branch: {
        title: 'Branch',
        description: 'Select one of the script path depending on conditions',
      },
      setVar: {
        title: 'Set variable',
        description: 'Set the value of a variable at runtime',
      },
      getVar: {
        title: 'Get variable',
        description: 'Get the value of a variable at runtime',
      },
      opEqual: {
        title: 'Equal (x = y)',
        description: 'Check if first argument equal to second one',
      },
      opNotEqual: {
        title: 'Not equal (x ≠ y)',
        description: 'Check if first argument is not equal to second one',
      },
      opLess: {
        title: 'Lesser (x < y)',
        description: 'Check if first argument lesser than second one',
      },
      opLessEqual: {
        title: 'Lesser or equal (x ≤ y)',
        description:
          'Check if first argument lesser than or equal to second one',
      },
      opMore: {
        title: 'Greater  (x > y)',
        description: 'Check if first argument greater than second one',
      },
      opMoreEqual: {
        title: 'Greater or equal (x ≥ y)',
        description:
          'Check if first argument greater than or equal to second one',
      },
      opPlus: {
        title: 'Addition (x + y)',
        description: 'Returns result of addition of two arguments',
      },
      opMinus: {
        title: 'Subtraction (x - y)',
        description: 'Returns result of subtraction of two arguments',
      },
      opMult: {
        title: 'Multiplication (x * y)',
        description: 'Returns result of multiplication of two arguments',
      },
      opDiv: {
        title: 'Division (x / y)',
        description: 'Returns result of division of two arguments',
      },
      opMod: {
        title: 'Remainder of division (x % y)',
        description: 'Returns remainder of division of two arguments',
      },
      opAnd: {
        title: 'Logical AND (x && y)',
        description: 'Returns logical AND of two arguments',
      },
      opOr: {
        title: "Logical OR (x {'|'}{'|'} y)",
        description: 'Returns logical OR of two arguments',
      },
      opNot: {
        title: 'Logical NOT (!x)',
        description: 'Returns logical NOT of argument',
      },
      constBoolean: {
        title: 'Boolean constant',
        description: 'Boolean value',
      },
      constInteger: {
        title: 'Integer constant',
        description: 'Integer value',
      },
      constFloat: {
        title: 'Float constant',
        description: 'Float value',
      },
      constString: {
        title: 'String constant',
        description: 'String value',
      },
      constText: {
        title: 'Text constant',
        description: 'Text value',
      },
      constAsset: {
        title: 'Asset constant',
        description: 'Asset value',
      },
    },
    speech: {
      add: 'Add',
      addOption: 'Add option',
      character: 'Character',
      enterSpeech: 'Enter speech',
      deleteOption: 'Delete option',
      deleteOptionConfirm: 'Are you sure want to delete option?',
      enterText: 'Enter text',
      addOptionCondition: 'Add condition',
      deleteOptionCondition: 'Delete option condition',
      deleteOptionConditionConfirm:
        'Are you sure want to delete option condition?',
      parameters: 'Speech parameters',
      speechProperties: 'Speech properties',
      responseOptionsProperties: 'Response options properties',
      autoSubstitutionHelpText:
        'Automatically populate value from previous speech node',
      attachCover: 'Attach cover image',
      dettachCover: 'Delete cover',
      dettachCoverConfirm: 'Are you sure want to delete cover image?',
    },
    dataFields: {
      condition: 'Condition',
      value: 'Value',
      yes: 'Yes',
      no: 'No',
    },
    common: {
      noValue: 'Not set',
    },
    addStartLevelHint:
      'There is no start node in the script. Right-click on the field to create a node.',
    trigger: {
      addInputParameter: 'Add input parameter',
      addOutputParameter: 'Add output parameter',
      parameterAlreadyExists: 'Parameter already exists',
      deleteParameter: 'Delete parameter',
      changeParameter: 'Change paramter',
      duplicateParameter: 'Duplicate parameter',
    },
    var: {
      manageVariables: 'Manage variables',
      editVariable: 'Edit variable',
      duplicateVariable: 'Duplicate variable',
      deleteVariable: 'Delete variable',
      deleteVariableConfirm: 'Are you sure want to delete variable?',
      createVariable: 'Create variable',
      variableAlreadyExists: 'Variable already exists',
      nameIsEmpty: 'Name is empty',
      noVariablesYet: 'You have no variables yet',
      name: 'Name',
      type: 'Type',
      description: 'Description',
      enterName: 'Enter name',
      enterType: 'Choose type',
      enterDescription: 'Enter description',
      types: {
        any: 'Any',
        boolean: 'Boolean',
        integer: 'Integer',
        float: 'Float',
        text: 'Text',
        string: 'String',
        asset: 'Asset',
      },
    },
    play: {
      play: 'Play',
      playDemo: 'Run in presentation mode',
      playDebug: 'Run in debug mode',
      switchDemo: 'Switch to presentation mode',
      switchDebug: 'Switch to debug mode',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      continue: 'Continue',
      select: 'Select',
      restart: 'Restart',
      stepBack: 'Step back',
      stepForward: 'Step forward',
    },
    contents: {
      varGet: 'Get',
      varSet: 'Set',
    },
  },
};
