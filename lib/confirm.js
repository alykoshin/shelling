const {keypress} = require('./keypress');


const confirm = async(s) => {
  const charCode = await keypress(s);
  const char = String.fromCharCode(charCode);
  console.log(char);

  if (char === 'Y' || char === 'y') {
    return true;
  }
  console.log('Execution cancelled');
  return false;
};


module.exports = {
  confirm,
};
