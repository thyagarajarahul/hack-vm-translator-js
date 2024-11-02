const {
  REGISTERS,
  COMMAND,
  INSTRUCTIONS,
  SEGMENTS,
  SYMBOLS,
  TEMP_BASE_ADDRESS,
  VM_EXTENSION,
} = require('./constants');

const buildPush = (address, offset) => [
  `@${address}`,
  isNaN(+address) ? 'D=M' : 'D=A',
  ...(offset ? [`@${offset}`, 'A=D+A', 'D=M'] : []),
];

const buildPop = (address, offset, setM) => [
  `@${address}`,
  setM ? 'M=D' : isNaN(+address) ? 'D=M' : 'D=A',
  ...(offset ? [`@${offset}`, 'D=D+A', `@${REGISTERS.R13}`, 'M=D'] : []),
];

const setPopM = () => [`@${REGISTERS.R13}`, 'A=M', 'M=D'];

const setComparisonD = () => {
  const pop = [...INSTRUCTIONS[COMMAND.MEMORY.POP]];

  pop.splice(pop.length - 1, 1, 'D=M-D');

  return pop;
};

const getUnaryPop = (command) => {
  if (command === COMMAND.ARITHMETIC.NEG || command === COMMAND.LOGICAL.NOT) return ['@SP', 'A=M'];

  return INSTRUCTIONS[COMMAND.MEMORY.POP];
};

const getComparisonLabels = (command, counter) => [
  `@TRUE_${counter}`,
  `D;J${command.toUpperCase()}`,
  'D=0',
  `@FALSE_${counter}`,
  '0;JMP',
  `(TRUE_${counter})`,
  'D=-1',
  `(FALSE_${counter})`,
];

const isComparison = (command) => Object.values(COMMAND.COMPARISION).includes(command);

const saveLocal = () => [`@${SYMBOLS[SEGMENTS.local]}`, 'D=M', `@${REGISTERS.R13}`, 'M=D'];

const repositionArguments = (arguments) => [
  '@SP',
  'D=M',
  '@5',
  'D=D-A',
  `@${arguments}`,
  'D=D-A',
  `@${SYMBOLS[SEGMENTS.argument]}`,
  'M=D',
];

const repositionLocal = () => ['@SP', 'D=M', `@${SYMBOLS[SEGMENTS.local]}`, 'M=D'];

const repositionReturn = () => [
  ...INSTRUCTIONS[COMMAND.MEMORY.POP],
  `@${SYMBOLS[SEGMENTS.argument]}`,
  'A=M',
  'M=D',
];

const repositionSP = () => [`@${SYMBOLS[SEGMENTS.argument]}`, 'D=M+1', '@SP', 'M=D'];

const saveSegment = (address) => {
  const isMemorySegment = Object.values(SYMBOLS).includes(address);

  return [`@${address}`, isMemorySegment ? 'D=M' : 'D=A', ...INSTRUCTIONS[COMMAND.MEMORY.PUSH]];
};

const restoreSegment = (address, offset) => [
  '@R13',
  'D=M',
  `@${offset}`,
  'A=D-A',
  'D=M',
  `@${address}`,
  'M=D',
];

const getReturnAddress = () => restoreSegment(REGISTERS.R14, 5);

const gotoAddress = (address) =>
  [`@${address}`, REGISTERS[address] && 'A=M', '0;JMP'].filter((instruction) => instruction !== undefined);

const genReturnLabel = (() => {
  const labels = {};
  return (functionName) => {
    labels[functionName] = (labels[functionName] || 0) + 1;
    return `${functionName}$ret.${labels[functionName]}`;
  };
})();

const buildCommand = {
  [COMMAND.MEMORY.PUSH]: buildPush,
  [COMMAND.MEMORY.POP]: buildPop,
};

const writePushPop = (instruction, fileName, lineCount) => {
  const [commandType, arg1, arg2] = instruction.split(' ');

  let commands = [];
  let setM = false;

  switch (arg1) {
    case SEGMENTS.local:
    case SEGMENTS.argument:
    case SEGMENTS.this:
    case SEGMENTS.that:
      commands = buildCommand[commandType](SYMBOLS[arg1], arg2);
      break;
    case SEGMENTS.constant:
      if (commandType === COMMAND.MEMORY.POP)
        throw new Error(`Error in file ${fileName}${VM_EXTENSION} at line ${lineCount}: Cannot Pop Constant`);
      commands = buildPush(arg2);
      break;
    case SEGMENTS.static:
      setM = commandType === COMMAND.MEMORY.POP;
      commands = buildCommand[commandType](`${fileName}.${arg2}`, null, setM);
      break;
    case SEGMENTS.pointer:
      if (+arg2 > 1)
        throw new Error(
          `Error in file ${fileName}${VM_EXTENSION} at line ${lineCount}: Invalid Segment Index`
        );
      setM = commandType === COMMAND.MEMORY.POP;
      commands = buildCommand[commandType](SYMBOLS[+arg2 === 1 ? SEGMENTS.that : SEGMENTS.this], null, setM);
      break;
    case SEGMENTS.temp:
      if (+arg2 > 7)
        throw new Error(
          `Error in file ${fileName}${VM_EXTENSION} at line ${lineCount}: Invalid Segment Index`
        );
      commands = buildCommand[commandType](TEMP_BASE_ADDRESS, arg2);
      break;
  }

  if (!setM) {
    commands.push(...INSTRUCTIONS[commandType]);
  } else {
    commands.unshift(...INSTRUCTIONS[COMMAND.MEMORY.POP]);
  }

  if (commandType === COMMAND.MEMORY.POP && !setM) commands.push(...setPopM());

  return commands.join('\n');
};

const writeArithmetic = (instruction, lineCount) => {
  let commands = [];

  if (!isComparison(instruction, lineCount)) {
    commands = [...INSTRUCTIONS[instruction]];
  } else {
    commands = [
      ...setComparisonD(),
      ...getComparisonLabels(instruction, lineCount),
      ...INSTRUCTIONS[COMMAND.MEMORY.PUSH],
    ];
  }

  commands.unshift(...getUnaryPop(instruction));

  return commands.join('\n');
};

const writeBranching = (instruction) => {
  const [commandType, arg1] = instruction.split(' ');

  let commands = [];

  switch (commandType) {
    case COMMAND.BRANCHING.LABEL:
      commands = [`(${arg1})`];
      break;
    case COMMAND.BRANCHING.GOTO:
      commands = [`@${arg1}`, ...INSTRUCTIONS[commandType]];
      break;
    case COMMAND.BRANCHING.IFGOTO:
      commands = [...INSTRUCTIONS[COMMAND.MEMORY.POP], `@${arg1}`, ...INSTRUCTIONS[commandType]];
      break;
  }

  return commands.join('\n');
};

const writeFunction = (instruction) => {
  const [commandType, arg1, arg2] = instruction.split(' ');

  let commands = [];

  switch (commandType) {
    case COMMAND.BRANCHING.FUNCTION:
      commands = [
        `(${arg1})`,
        ...Array(+arg2)
          .fill()
          .reduce((accumulator) => accumulator.concat(buildPush(0), INSTRUCTIONS[COMMAND.MEMORY.PUSH]), []),
      ];
      break;
    case COMMAND.BRANCHING.CALL:
      const RETURN_LABEL = genReturnLabel(arg1);
      commands = [
        ...saveSegment(RETURN_LABEL),
        ...saveSegment(SYMBOLS[SEGMENTS.local]),
        ...saveSegment(SYMBOLS[SEGMENTS.argument]),
        ...saveSegment(SYMBOLS[SEGMENTS.this]),
        ...saveSegment(SYMBOLS[SEGMENTS.that]),
        ...repositionArguments(+arg2),
        ...repositionLocal(),
        ...gotoAddress(arg1),
        `(${RETURN_LABEL})`,
      ];
      break;
    case COMMAND.BRANCHING.RETURN:
      commands = [
        ...saveLocal(),
        ...getReturnAddress(),
        ...repositionReturn(),
        ...repositionSP(),
        ...restoreSegment(SYMBOLS[SEGMENTS.that], 1),
        ...restoreSegment(SYMBOLS[SEGMENTS.this], 2),
        ...restoreSegment(SYMBOLS[SEGMENTS.argument], 3),
        ...restoreSegment(SYMBOLS[SEGMENTS.local], 4),
        ...gotoAddress(REGISTERS.R14),
      ];
      break;
  }

  return commands.join('\n');
};

module.exports = {
  writePushPop,
  writeArithmetic,
  writeBranching,
  writeFunction,
};
