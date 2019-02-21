// https://stackoverflow.com/a/49959557
const keypress = async (s) => {
  if (s) process.stdout.write(s);
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', data => {
    const byteArray = [...data]
    //console.log('keypress:', byteArray);

    const charCode = (byteArray.length > 0 && byteArray[0]);
    //if (byteArray.length > 0 && (
    //  byteArray[0] === 'Y'.charCodeAt(0)
    //  || byteArray[0] === 'y'.charCodeAt(0)
    //)) {
    //  console.log('Yy')
    //  process.stdin.setRawMode(false)
    //  return resolve(byteArray);
    //}

    if (charCode === 3) {
      console.log('^C');
      process.exit(1)
    }

    process.stdin.setRawMode(false)
    return resolve(charCode);
    //console.log('Cancelled')
    //process.exit(1)
  }))
};

module.exports = keypress;
