
const logger = {
  silly: function(/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[silly] ');
    //return console.log.apply(console, args);
  },//console.log(  '[silly] ', ...args),
  debug: function(/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[debug] ');
    return console.log.apply(console, args);
  },//console.log(  '[debug] ', ...args),
  log:  function (/*...args*/) {
    const args = Array.prototype.slice.call(arguments, 0);
    args.unshift('[log]   ');
    return console.log.apply(console, args);
    //console.log(arguments)
  },
  warn: function(/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[warn]  ');
    return console.warn.apply(console, args);
  },
  error: function(/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[error] ');
    return console.error.apply(console, args);
  },
};

const child_process = require('child_process');
const spawn = child_process.spawn;



class Cmd {


  constructor(config) {
    config = config || {};
    logger.debug('Cmd(): config:', config);
    this.config = config;
  };


  _execute(pathname, params, options, exitCallback) {
    options = options || {};
    const { stdinStr='', stdio, print, } = options;

    logger.debug('Cmd.execute(): spawn(): pathname: ' + pathname + '; params: ' + JSON.stringify(params));

    // Starting external process
    const PIPE_STDIN  = stdio && stdio[0] || true;
    const PIPE_STDOUT = stdio && stdio[1] || false;
    const PIPE_STDERR = stdio && stdio[2] || false;
    const defaultStdio = [
      PIPE_STDIN  ? 'pipe' : 'inherit',
      PIPE_STDOUT ? 'pipe' : 'inherit',
      PIPE_STDERR ? 'pipe' : 'inherit',
    ];
    const spawnOptions = {
      //encoding: 'buffer',
      //stdio: 'inherit',
      //stdio: [ 'pipe', 'inherit', 'inherit', ],
      //stdio: [ 'pipe', 'pipe', 'pipe', ],
      stdio: stdio || defaultStdio,
    };

    let output   = '';
    let exitCode = null;
    let child;

    try {
      child = spawn(pathname, params, spawnOptions);
    } catch (e) {
      logger.error('Cmd.execute(): spawn():', e);
      if (exitCallback) exitCallback(e, output);
      return false;
    }

    // Write to stdin stream

    logger.debug('Cmd.execute(): child.stdin.write(): stdinStr: ' + stdinStr);

    try {
      child.stdin.write(stdinStr);
      child.stdin.end();
    } catch (e) {
      logger.error('Cmd.execute(): child.stdin.write():', e);
      if (exitCallback) exitCallback(e, output);
      return false;
    }

    logger.debug('Cmd.execute(): spawned with pid:', child.pid);

    // Handlers for spawned process

    PIPE_STDOUT && child.stdout.on('data', (data) => {
      output += data;
      logger.silly('Cmd.execute(): child.stdout.on(\'data\'): data: ' + data);
      let needPrint = false;
      if (typeof print!=='undefined') { needPrint = print; }
      else { needPrint = this.config.print; }
      if (needPrint === 'json') process.stdout.write(JSON.stringify(data));
      else if (needPrint) process.stdout.write(data);
    });

    PIPE_STDOUT && child.stdout.on('close', () => {
      logger.debug('Cmd.execute(): child.stdout.on(\'close\')');
      // !!! child.on('exit') may occur before child.stdout.on('data')
      // !!! we already call callback in on('finish')
      // if (exitCallback) { exitCallback(exitCode, output); }
    });

    PIPE_STDOUT && child.stdout.on('finish', () => {
      logger.debug('Cmd.execute(): child.stdout.on(\'finish\')');
      // !!! child.on('exit') may occur before child.stdout.on('data')
      //if (exitCallback) {
      //  exitCallback(exitCode, output);
      //}
    });

    PIPE_STDERR && child.stderr.on('data', (data) => {
      output += data;
      logger.error('Cmd.execute(): child.stderr.on(\'data\'): data: ' + data);
      if (this.config.print) {
        process.stdout.write(JSON.stringify(data));
      }
    });

    child.on('error', (error) => {
      logger.error('Cmd.execute(): child.on(\'error\') child process returned error:', error);
      if (exitCallback) exitCallback(error, output);
    });

    child.on('exit', (code) => {
      logger.debug('Cmd.execute(): child.on(\'exit\') child process exited with code:', code);
      if (code !== 0) {
        logger.error('Cmd.execute(): child.on(\'exit\') child process exited with NON-ZERO code:', code);
      }
      if (exitCallback) exitCallback(code, output, code);
      //exitCode = code;
      // !!! child.on('exit') may occur before child.stdout.on('data')
      // if (exitCallback) { exitCallback((code !== 0), output); }
    });

    child.on('close', (code) => {
      logger.debug('Cmd.execute(): child.on(\'close\') child process exited with code:', code);
      if (code !== 0) {
        logger.error('Cmd.execute(): child.on(\close\') child process exited with NON-ZERO code:', code);
      }
      exitCode = code;
      // !!! child.on('exit') may occur before child.stdout.on('data')
      // if (exitCallback) { exitCallback((code !== 0), output); }
    });

    return true;
  };


  execute(params, stdinObj, exitCallback) {
    const self     = this;
    var output   = '';
    var exitCode = null;
    var child;

    if (!self.config.platforms.hasOwnProperty(process.platform)) {
      exitCallback(new Error("Unknown process platform: " + process.platform));
      return false;
    }
    const pathname = self.config.platforms[ process.platform ].pathname;

    logger.debug('Cmd.execute(): spawn(): pathname: ' + pathname + '; params: ' + JSON.stringify(params));
    logger.debug('Cmd.execute(): child.stdin.write(): stdinObj: ' + JSON.stringify(stdinObj));

    // Starting external process

    return this._execute(pathname, params, JSON.stringify(stdinObj), exitCallback);
  }


  getKey(keyRequestObj, exitCallback) {

    // Parameter for MockSafeNet.exe
    var params = [];
    if (this.config.hasOwnProperty('mock') && this.config.mock) {
      params.push('mock');
    }

    this.execute(params, keyRequestObj, function (err, key) {
      key = key || '';
      // If no data was returned
      key = key.trim();
      // Remove spaces/tabs/end-of-lines

      exitCallback(err, key);
    });
  }


}

// Exporting object

module.exports = function(config) {
  return new Cmd(config);
};
