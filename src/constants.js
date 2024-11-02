const VM_EXTENSION = '.vm';

const ASM_EXTENSION = '.asm';

const TEMP_BASE_ADDRESS = 5;

const SEGMENTS = {
  local: 'local',
  argument: 'argument',
  this: 'this',
  that: 'that',
  constant: 'constant',
  static: 'static',
  pointer: 'pointer',
  temp: 'temp',
};

const SYMBOLS = {
  [SEGMENTS.local]: 'LCL',
  [SEGMENTS.argument]: 'ARG',
  [SEGMENTS.this]: 'THIS',
  [SEGMENTS.that]: 'THAT',
};

const REGISTERS = {
  R13: 'R13',
  R14: 'R14',
  R15: 'R15',
};

const COMMENT_REGEX = /\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|^\/\/.*/g;

const VALID_NAME_REGEX = '[a-zA-Z][\\w\\.:_]*';
const PUSH_REGEX = /^push\s+\w+\s+\d+$/;
const POP_REGEX = /^pop\s+\w+\s+\d+$/;
const ARITHMETIC_REGEX = /^(add|sub|neg|eq|gt|lt|and|or|not)$/;
const LABEL_REGEX = new RegExp(`^label\\s+${VALID_NAME_REGEX}$`);
const GOTO_REGEX = new RegExp(`^goto\\s+${VALID_NAME_REGEX}$`);
const IF_GOTO_REGEX = new RegExp(`^if-goto\\s+${VALID_NAME_REGEX}$`);
const FUNCTION_REGEX = new RegExp(`^function\\s+${VALID_NAME_REGEX}\\s+\\d+$`);
const CALL_REGEX = new RegExp(`^call\\s+${VALID_NAME_REGEX}\\s+\\d+$`);
const RETURN_REGEX = /^(return)$/;

const COMMAND = {
  MEMORY: {
    PUSH: 'push',
    POP: 'pop',
  },
  ARITHMETIC: {
    ADD: 'add',
    SUB: 'sub',
    NEG: 'neg',
  },
  LOGICAL: {
    OR: 'or',
    AND: 'and',
    NOT: 'not',
  },
  COMPARISION: {
    EQ: 'eq',
    LT: 'lt',
    GT: 'gt',
  },
  BRANCHING: {
    LABEL: 'label',
    GOTO: 'goto',
    IFGOTO: 'if-goto',
    FUNCTION: 'function',
    CALL: 'call',
    RETURN: 'return',
  },
  END: 'end',
};

const INSTRUCTIONS = {
  [COMMAND.MEMORY.PUSH]: ['@SP', 'A=M', 'M=D', '@SP', 'M=M+1'],
  [COMMAND.MEMORY.POP]: ['@SP', 'AM=M-1', 'D=M'],
  [COMMAND.ARITHMETIC.ADD]: ['A=A-1', 'M=D+M'],
  [COMMAND.ARITHMETIC.SUB]: ['A=A-1', 'M=M-D'],
  [COMMAND.ARITHMETIC.NEG]: ['A=A-1', 'M=-M'],
  [COMMAND.LOGICAL.AND]: ['A=A-1', 'M=D&M'],
  [COMMAND.LOGICAL.OR]: ['A=A-1', 'M=D|M'],
  [COMMAND.LOGICAL.NOT]: ['A=A-1', 'M=!M'],
  [COMMAND.BRANCHING.IFGOTO]: ['D;JNE'],
  [COMMAND.BRANCHING.GOTO]: ['0;JMP'],
  [COMMAND.END]: ['(END)', '@END', '0;JMP'],
};

module.exports = {
  VM_EXTENSION,
  ASM_EXTENSION,
  TEMP_BASE_ADDRESS,
  SEGMENTS,
  SYMBOLS,
  REGISTERS,
  COMMENT_REGEX,
  PUSH_REGEX,
  POP_REGEX,
  ARITHMETIC_REGEX,
  LABEL_REGEX,
  GOTO_REGEX,
  IF_GOTO_REGEX,
  FUNCTION_REGEX,
  CALL_REGEX,
  RETURN_REGEX,
  COMMAND,
  INSTRUCTIONS,
};
