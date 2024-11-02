const fs = require('fs');
const path = require('path');
const lineReader = require('line-reader');

const {
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
  VM_EXTENSION,
  INSTRUCTIONS,
  COMMAND,
} = require('./constants');

const { writePushPop, writeArithmetic, writeBranching, writeFunction } = require('./codeWriter');

let fileIndex = 0,
  result = '';

const parse = (filename, files, destination) => {
  const current = files[fileIndex];
  const count = files.length;

  if (!path.extname(current.path).endsWith(VM_EXTENSION)) {
    console.error(`File does not seem to be an vm file. Please save the file as ${VM_EXTENSION}`);
    process.exit(1);
  }

  if (!fs.existsSync(current.path)) {
    console.error('File does not exist');
    process.exit(1);
  }

  let lineCount = 0;

  lineReader.eachLine(current.path, (line, last) => {
    const instruction = line.replace(COMMENT_REGEX, '').trim();

    if (instruction) {
      result += `// ${instruction}\n`;
    }

    switch (true) {
      case PUSH_REGEX.test(instruction):
      case POP_REGEX.test(instruction):
        result += writePushPop(instruction, current.name, lineCount) + '\n';
        break;
      case ARITHMETIC_REGEX.test(instruction):
        result += writeArithmetic(instruction, lineCount) + '\n';
        break;
      case LABEL_REGEX.test(instruction):
      case GOTO_REGEX.test(instruction):
      case IF_GOTO_REGEX.test(instruction):
        result += writeBranching(instruction) + '\n';
        break;
      case FUNCTION_REGEX.test(instruction):
      case CALL_REGEX.test(instruction):
      case RETURN_REGEX.test(instruction):
        result += writeFunction(instruction) + '\n';
        break;
      default:
        if (instruction)
          throw new Error(
            `Error in file ${current.name}${VM_EXTENSION} at line ${lineCount}: Invalid VM Command`
          );
    }

    lineCount++;

    if (last) {
      if (fileIndex < count - 1) {
        fileIndex++;
        parse(filename, files, destination);
        return;
      }

      const end = INSTRUCTIONS[COMMAND.END].join('\n');

      result = result.concat(end + '\n');

      saveFile(result, destination);
    }
  });
};

const saveFile = (result, destination) => {
  try {
    fs.writeFileSync(destination, result);

    console.log('Code translated successfully!');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = parse;
