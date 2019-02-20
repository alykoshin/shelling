'use strict';

const Spawn = require('./spawn');
const spawn = new Spawn({ print: true });


//const spawnExecute = (cmd, params, stdinStr, cb) => {
//  console.log('* ' + cmd + ' ' + params.join(' '));
//
//  return spawn._execute(cmd, params, stdinStr, (error, stdout) => {
//    if (error) {
//      console.error(`exec error: ${error}`);
//      console.log(`stdout: ${stdout}`);
//      return cb(error);
//    }
//    console.log(`stdout: ${stdout}`);
//    return cb(null, stdout);
//  });
//
//};


async function _spawnExecutePromised(cmd, params, options) {

  if (typeof command === 'string') command = command.split(/[ \t]+/);

  if (Array.isArray(cmd)) {
    // we have only 2 arguments; 1st one contains cmd and params
    options = params;
    params = cmd.slice(1);
    cmd = cmd[0];
  }
  console.log('* ' + cmd + ' ' + params.join(' '));

  return new Promise( (resolve, reject) => {

    return spawn._execute(cmd, params, options, (error, stdout) => {
      //console.log(`stdout: ${stdout}`);
      if (error) {
        console.error(`ERROR: $
        {error}`);
        return reject(error);
      }
      console.log(`* stdout: "${stdout}"`);
      return resolve(stdout);
    });

  });
}


async function spawnCapture(command) {
  let res = await _spawnExecutePromised(command, { print: false, stdinStr: '', stdio: [ 'pipe', 'pipe', 'pipe' ] });
  return res.trim();
}


module.exports = {
  _spawnExecutePromised,
  spawnCapture,
};
