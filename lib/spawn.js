const child_process = require('child_process');
const spawn = child_process.spawn;

const stringUtils = require('./stringUtils');


const DEFAULT_LEVEL = 'warn';
const LEVELS = [ 'silly', 'debug', 'log', 'warn', 'error', 'none' ];

const Logger = class {
  constructor(config) {
    config = config || {};
    this.setNewLevel(config.level);
  }
  setNewLevel(levelName) {
    levelName = levelName || DEFAULT_LEVEL;
    this.lvl = LEVELS.indexOf(levelName);
    if (this.lvl < 0) this.lvl = LEVELS.indexOf(DEFAULT_LEVEL);
    this.levels = this.levels || {};
    LEVELS.forEach(name => this.levels[name] = this.isLevelEnabled(name));
  }
  isLevelEnabled(name) {
    return LEVELS.indexOf(name) >= this.lvl;
  }
  silly (/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[silly] ');
    this.levels.silly && console.log.apply(console, args);
  }//console.log(  '[silly] ', ...args),
  debug (/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[debug] ');
    this.levels.debug && console.log.apply(console, args);
  }//console.log(  '[debug] ', ...args),
  log (/*...args*/) {
    const args = Array.prototype.slice.call(arguments, 0);
    args.unshift('[log]   ');
    this.levels.log && console.log.apply(console, args);
    //console.log(arguments)
  }
  warn (/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[warn]  ');
    this.levels.warn && console.warn.apply(console, args);
  }
  error (/*...args*/) {
    const args = Array.prototype.slice.call(arguments);
    args.unshift('[error] ');
    this.levels.error && console.error.apply(console, args);
  }
};

const printChunk = (data, needPrint) => {
  if (needPrint === 'json') process.stdout.write(JSON.stringify(data));
  else if (needPrint) process.stdout.write(data.toString('utf8'));
};


class Cmd {

  constructor(config) {
    config = config || {};
    this.logger = new Logger({ level: config.logging || DEFAULT_LEVEL });
    this.logger.debug('Cmd(): config:', config);
    this.config = config;
  };

  _execute(pathname, params, options, exitCallback) {

    options = options || {};
    const { stdinStr='', stdio, print, } = options;
    const needPrint = (typeof print!=='undefined') ? print : this.config.print;

    this.logger.debug('Cmd.execute(): spawn(): pathname: ' + pathname + '; params: ' + JSON.stringify(params));

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
      this.logger.error('Cmd.execute(): spawn():', e);
      if (exitCallback) exitCallback(e, output);
      return false;
    }

    // Write to stdin stream

    this.logger.debug('Cmd.execute(): child.stdin.write(): stdinStr: ' + stdinStr);

    try {
      child.stdin.write(stdinStr);
      child.stdin.end();
    } catch (e) {
      this.logger.error('Cmd.execute(): child.stdin.write():', e);
      if (exitCallback) exitCallback(e, output);
      return false;
    }

    this.logger.debug('Cmd.execute(): spawned with pid:', child.pid);

    // Handlers for spawned process

    PIPE_STDOUT && child.stdout.on('data', (data) => {
      output += data;
      this.logger.silly('Cmd.execute(): child.stdout.on(\'data\'): data: ' + data);
      printChunk(data, needPrint);
    });

    PIPE_STDOUT && child.stdout.on('close', () => {
      this.logger.debug('Cmd.execute(): child.stdout.on(\'close\')');
      // !!! child.on('exit') may occur before child.stdout.on('data')
      // !!! we already call callback in on('finish')
      // if (exitCallback) { exitCallback(exitCode, output); }
    });

    PIPE_STDOUT && child.stdout.on('finish', () => {
      this.logger.debug('Cmd.execute(): child.stdout.on(\'finish\')');
      // !!! child.on('exit') may occur before child.stdout.on('data')
      //if (exitCallback) {
      //  exitCallback(exitCode, output);
      //}
    });

    PIPE_STDERR && child.stderr.on('data', (data) => {
      output += data;
      this.logger.error('Cmd.execute(): child.stderr.on(\'data\'): data: ' + data);

      printChunk(data, needPrint);
    });

    child.on('error', (error) => {
      this.logger.error('Cmd.execute(): child.on(\'error\') child process returned error:', error);
      if (exitCallback) exitCallback(error, output);
    });

    child.on('exit', (code) => {
      this.logger.debug('Cmd.execute(): child.on(\'exit\') child process exited with code:', code);
      if (code !== 0) {
        this.logger.error('Cmd.execute(): child.on(\'exit\') child process exited with NON-ZERO code:', code);
      }
      if (exitCallback) exitCallback(code, output, code);
      //exitCode = code;
      // !!! child.on('exit') may occur before child.stdout.on('data')
      // if (exitCallback) { exitCallback((code !== 0), output); }
    });

    child.on('close', (code) => {
      this.logger.debug('Cmd.execute(): child.on(\'close\') child process exited with code:', code);
      if (code !== 0) {
        this.logger.error('Cmd.execute(): child.on(\close\') child process exited with NON-ZERO code:', code);
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

    this.logger.debug('Cmd.execute(): spawn(): pathname: ' + pathname + '; params: ' + JSON.stringify(params));
    this.logger.debug('Cmd.execute(): child.stdin.write(): stdinObj: ' + JSON.stringify(stdinObj));

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

  async _spawnExecutePromised(cmd, params, options) {

    if (typeof cmd === 'string') cmd = stringUtils.splitQuoted(cmd);

    if (Array.isArray(cmd)) {
      // we have only 2 arguments; 1st one contains cmd and params
      options = params;
      params = cmd.slice(1);
      cmd = cmd[0];
    }
    console.log('* ' + cmd + ' ' + params.join(' '));

    return new Promise( (resolve, reject) => {

      return this._execute(cmd, params, options, (error, stdout) => {
        //console.log(`stdout: ${stdout}`);
        if (error) {
          //console.error(`ERROR: ${error}`);
          return reject(error);
        }
        //console.log(`* stdout: "${stdout}"`);
        return resolve(stdout);
      });

    });
  }


  async spawnCapture(command) {
    let res = await this._spawnExecutePromised(command, { print: false, stdinStr: '', stdio: [ 'pipe', 'pipe', 'pipe' ] });
    return res.trim();
  }

  async _spawnCapturePrint(command) {
    let res = await this._spawnExecutePromised(command, { print: true, stdinStr: '', stdio: [ 'pipe', 'pipe', 'pipe' ] });
    return res.trim();
  }





}

// Exporting object

module.exports = function(config) {
  return new Cmd(config);
};
