//
// https://nodejs.org/api/errors.html
//
const nodeErrors = require('./nodeErrors.json');
const linuxErrors = require('./nodeErrors.json');

const RESERVED_NAME = '__description';

function lookup(code) {
  const DEFAULT_DESCRIPTION = {
    notFound: true,
    short: 'Not found',
    long: 'Code not found nor in a list of system errors commonly-encountered when writing a Node.js program (https://nodejs.org/api/errors.html), nor in a comprehensive list (errno(3) man page http://man7.org/linux/man-pages/man3/errno.3.html)',
  };
  const nodeError = code!==RESERVED_NAME && nodeErrors[code];
  if (nodeError) {
    return nodeError;
  } else {
    const linuxError = code!==RESERVED_NAME && linuxErrors[code];
    return linuxError ? { short: linuxError } : DEFAULT_DESCRIPTION;
  }
}


module.exports = {
  lookup,
};
